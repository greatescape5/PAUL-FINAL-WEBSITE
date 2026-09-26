// Minimal CSV parsing for subscriber imports: auto-detects the email column
// (by pattern) and takes the name from another column, with or without a header.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Parse one CSV line into trimmed fields (handles quoted fields + escaped quotes).
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsv(text: string): { email: string; name: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length === 0) return [];
  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => h.includes('email') || h === 'name' || h.includes('first') || h.includes('full'));
  const emailIdx = hasHeader ? header.findIndex((h) => h.includes('email')) : -1;
  const nameIdx = hasHeader ? header.findIndex((h) => h === 'name' || h.includes('first') || h.includes('full')) : -1;
  const start = hasHeader ? 1 : 0;

  const out: { email: string; name: string }[] = [];
  for (let i = start; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    let email = emailIdx >= 0 ? (cells[emailIdx] || '') : '';
    if (!EMAIL_RE.test(email)) email = cells.find((c) => EMAIL_RE.test(c)) || '';
    let name = nameIdx >= 0 ? (cells[nameIdx] || '') : '';
    if (!name) {
      // Prefer a cell that reads like a name (has letters) over a numeric one
      // (e.g. a phone column), falling back to any non-email cell.
      const other = (c: string) => c && c !== email && !EMAIL_RE.test(c);
      name = cells.find((c) => other(c) && /[a-zA-Z]/.test(c)) || cells.find(other) || '';
    }
    if (EMAIL_RE.test(email)) out.push({ email, name });
  }
  return out;
}
