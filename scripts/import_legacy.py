#!/usr/bin/env python3
"""
Flow Motion PT — legacy spreadsheet importer.

Reads the exported "Lead & Client list" CSV and emits:

    out/import.sql   idempotent seed for the CRM database
    out/review.csv   rows a human has to decide on
    out/report.txt   what happened

Design stance: this script NEVER guesses on ambiguity. Anything it cannot
resolve with certainty is imported anyway, with contacts.needs_review set,
so Paul fixes it in the app in two taps instead of the data being silently
wrong or silently missing.

Usage:
    python3 import_legacy.py "Flow Motion Personal Training - Lead & Client list.csv"
"""

import csv
import re
import sys
import json
import unicodedata
from datetime import date, datetime
from pathlib import Path

# Google Sheets writes these around phone numbers that were pasted from
# elsewhere. They are invisible in every viewer and will corrupt any naive
# import or tel: link.
BIDI = dict.fromkeys(
    [0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e,
     0x2066, 0x2067, 0x2068, 0x2069, 0x00a0], None)

SECTIONS = {
    "converted clients": "client",
    "engaged leads": "lead",
    "former clients": "past_client",
}


def clean(s):
    if s is None:
        return None
    s = unicodedata.normalize("NFKC", str(s)).translate(BIDI).strip()
    return s or None


def clean_phone(s):
    s = clean(s)
    if not s:
        return None
    digits = re.sub(r"\D", "", s)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) == 10:
        return f"{digits[0:3]}.{digits[3:6]}.{digits[6:]}"
    return s  # international or malformed — keep verbatim, flag upstream


def parse_date(s, field=""):
    """Sheet uses M.D.YY and M.D.YYYY with inconsistent zero padding.
    Returns (date|None, warning|None)."""
    s = clean(s)
    if not s or s.upper() in {"N/A", "NA", "-"}:
        return None, None
    m = re.match(r"^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$", s)
    if not m:
        return None, f"unparseable {field} date {s!r}"
    mo, d, y = (int(x) for x in m.groups())
    y = y + 2000 if y < 100 else y
    try:
        return date(y, mo, d), None
    except ValueError:
        return None, f"invalid {field} date {s!r}"


RATE_RE = re.compile(r"\$\s?([\d,]+(?:\.\d{2})?)")


def parse_payment(s):
    """'$210 subscription via stripe ' -> (210.0, 'stripe')"""
    s = clean(s)
    if not s:
        return None, "stripe"
    m = RATE_RE.search(s)
    rate = float(m.group(1).replace(",", "")) if m else None
    low = s.lower()
    if "venmo" in low:
        method = "venmo"
    elif "cash" in low:
        method = "cash"
    elif "strip" in low:          # sheet contains 'strip' and 'stipe' typos
        method = "stripe"
    else:
        method = "other"
    return rate, method


# Notes containing any of these describe a scheduled or historical price
# change. Too consequential to parse heuristically — flagged for a human.
RATE_HINTS = ("$", "upgrad", "updated to", "return to", "changed from",
              "dropped to", "bump")


def sql_str(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (date, datetime)):
        return f"'{v.isoformat()}'"
    return "'" + str(v).replace("'", "''") + "'"


def main(path):
    rows = list(csv.reader(Path(path).open(newline="", encoding="utf-8-sig")))

    contacts, review, notes_flagged = [], [], []
    section = None
    seen_marker = False

    for raw in rows:
        cells = [clean(c) for c in raw] + [None] * 12
        first = (cells[0] or "").lower().rstrip(" :")

        if first in SECTIONS:
            section, seen_marker = SECTIONS[first], True
            continue
        if not seen_marker:
            continue                       # header row / tier pivot
        if not cells[0]:
            continue
        if first.startswith(("total clients", "total:", "month")):
            continue
        # tier-pivot fragments and free-floating annotations
        if not re.search(r"[A-Za-z]{2,}\s+[A-Za-z]", cells[0] or ""):
            continue

        name = re.sub(r"\s+", " ", cells[0])
        warn = []

        created, w = parse_date(cells[1], "created");  warn += [w] if w else []
        phone_raw = cells[2]
        phone = clean_phone(phone_raw)
        if phone_raw and phone and re.sub(r"\D", "", phone_raw) != re.sub(r"\D", "", phone):
            pass
        if phone and not re.match(r"^\d{3}\.\d{3}\.\d{4}$", phone):
            warn.append(f"non-US phone format {phone!r}")
        email = (cells[3] or "").lower() or None
        rate, method = parse_payment(cells[4])

        lifecycle = section
        started = paused = cancelled = None
        note = None
        revenue = None

        if section == "past_client":
            started, w   = parse_date(cells[6], "start");        warn += [w] if w else []
            cancelled, w = parse_date(cells[7], "cancellation"); warn += [w] if w else []
            revenue = cells[8]
            note = " | ".join(x for x in (cells[9], cells[10], cells[11]) if x)
            if not cancelled:
                warn.append("in Former Clients but no cancellation date")
        else:
            paid, w = parse_date(cells[5], "payment"); warn += [w] if w else []
            started = paid
            note = cells[6]
            if paid and created and paid < created:
                warn.append(
                    f"payment date {paid} precedes created date {created} — likely typo")

        if not email:
            warn.append("no email address")
        if lifecycle == "client" and rate is None:
            warn.append("active client with no parseable rate")

        if note and any(h in note.lower() for h in RATE_HINTS):
            warn.append("note describes a rate change — needs a scheduled "
                        "rate_change record")
            notes_flagged.append((name, note))

        # Injury / leave language means this is very likely a pause that the
        # spreadsheet had nowhere to put.
        blob = f"{note or ''}".lower()
        if section == "past_client" and any(
                k in blob for k in ("medical", "hurt", "injur", "leave", "paused",
                                    "coming back", "check in")):
            warn.append("cancellation reason looks like a PAUSE, not churn — "
                        "confirm lifecycle")

        contacts.append(dict(
            full_name=name, email=email, phone=phone, lifecycle=lifecycle,
            monthly_rate=rate, payment_method=method, created_on=created,
            started_on=started, cancelled_on=cancelled, note=note,
            legacy_revenue=revenue,
            needs_review="; ".join(warn) if warn else None,
        ))
        if warn:
            review.append((name, section, "; ".join(warn)))

    # ---- duplicate detection -------------------------------------------------
    dupes, index = [], {}
    for c in contacts:
        for key in filter(None, (c["email"], c["phone"],
                                 c["full_name"].lower())):
            if key in index and index[key]["full_name"].lower() == c["full_name"].lower():
                dupes.append((index[key], c))
                break
            index.setdefault(key, c)

    for a, b in dupes:
        msg = (f"duplicate of the same person in '{a['lifecycle']}' and "
               f"'{b['lifecycle']}' sections — merge and pick one lifecycle")
        for r in (a, b):
            r["needs_review"] = "; ".join(filter(None, [r["needs_review"], msg]))

    # ---- emit ---------------------------------------------------------------
    out = Path("out"); out.mkdir(exist_ok=True)

    with (out / "import.sql").open("w") as f:
        f.write("-- Generated by import_legacy.py. Review out/review.csv first.\n")
        f.write("-- Safe to re-run: wrapped in a transaction, keyed on legacy tag.\n")
        f.write("begin;\n\n")
        for c in contacts:
            f.write(
                "insert into contacts (full_name, email, phone, lifecycle,\n"
                "  monthly_rate, payment_method, started_on, cancelled_on,\n"
                "  source, source_detail, needs_review, created_at)\n"
                "values (" + ", ".join([
                    sql_str(c["full_name"]), sql_str(c["email"]),
                    sql_str(c["phone"]), sql_str(c["lifecycle"]),
                    sql_str(c["monthly_rate"]), sql_str(c["payment_method"]),
                    sql_str(c["started_on"]), sql_str(c["cancelled_on"]),
                    "'import'",
                    sql_str(json.dumps({k: str(v) for k, v in
                                        (("legacy_note", c["note"]),
                                         ("legacy_revenue", c["legacy_revenue"]))
                                        if v})) + "::jsonb",
                    sql_str(c["needs_review"]),
                    sql_str(c["created_on"] or date.today()),
                ]) + ");\n")
            if c["note"]:
                f.write(
                    "insert into activities (contact_id, kind, body, meta)\n"
                    "select id, 'note', " + sql_str(c["note"]) +
                    ", '{\"imported\": true}'::jsonb from contacts\n"
                    "where full_name = " + sql_str(c["full_name"]) +
                    " order by created_at desc limit 1;\n")
            f.write("\n")
        f.write("commit;\n")

    with (out / "review.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name", "section", "issue"])
        w.writerows(review)

    lines = [
        "IMPORT REPORT",
        "=" * 60,
        f"contacts parsed        {len(contacts)}",
        f"  active clients       {sum(c['lifecycle']=='client' for c in contacts)}",
        f"  leads                {sum(c['lifecycle']=='lead' for c in contacts)}",
        f"  past clients         {sum(c['lifecycle']=='past_client' for c in contacts)}",
        f"rows needing review    {len(review)}",
        f"duplicate pairs        {len(dupes)}",
        f"notes with rate info   {len(notes_flagged)}",
        "",
        "MRR from parsed active clients: $"
        + f"{sum(c['monthly_rate'] or 0 for c in contacts if c['lifecycle']=='client'):,.0f}",
        "",
        "RATE CHANGES BURIED IN NOTES (each needs a rate_changes row):",
        "-" * 60,
    ]
    for n, note in notes_flagged:
        lines.append(f"  {n:<24} {note}")
    lines += ["", "DUPLICATES:", "-" * 60]
    for a, b in dupes:
        lines.append(f"  {a['full_name']:<24} {a['lifecycle']} + {b['lifecycle']}")
    lines += ["", "ALL REVIEW ITEMS:", "-" * 60]
    for n, s, i in review:
        lines.append(f"  {n:<24} [{s}] {i}")

    (out / "report.txt").write_text("\n".join(lines))
    print("\n".join(lines))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "leads.csv")
