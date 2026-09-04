# Supabase — Flow Motion PT

Database for the site's lead/client CRM (the "back end" Paul uses).

## Migrations — run in order

Paste each file into **Supabase → SQL Editor → Run**, in numeric order
(or apply with the Supabase CLI). Safe to run on a fresh project.

| File | What it creates |
|---|---|
| `migrations/0001_crm_schema.sql` | Tables, indexes, RLS (authenticated-only), and seed pipeline stages |
| `migrations/0002_crm_functions.sql` | State-transition functions (`set_lifecycle`, `undo_last_change`, `merge_contacts`, rate changes…) and the dashboard views (`v_today`, `v_mrr`, `v_contacts`, …) |

## Ground rules (why it's built this way)

- **All mutations go through the SQL functions in `0002`.** Never `UPDATE`
  the tables directly from the app — the functions write the audit trail in
  `activities` that makes **undo** work. The app layer for this lives in
  [`lib/crm.ts`](../lib/crm.ts).
- **Nothing hard-deletes.** Wrong data is corrected, archived, merged, or
  undone — never destroyed. `archived_at` / `merged_into` only.
- **RLS is on every table, `authenticated` only.** There is deliberately no
  anon policy. The public contact form writes via a service-role route
  handler, not the anon key.

## Importing the legacy spreadsheet

[`scripts/import_legacy.py`](../scripts/import_legacy.py) normalizes the
exported "Lead & Client list" CSV. It never guesses — ambiguous rows import
with `needs_review` set so they're fixed in the app.

```bash
python3 scripts/import_legacy.py "Flow Motion Personal Training - Lead & Client list.csv"
# then read out/review.csv, then run out/import.sql after the migrations
```

## Env

Set in `.env.local` (and Vercel): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only,
used by the contact-form route). Auth is magic-link, two users.
