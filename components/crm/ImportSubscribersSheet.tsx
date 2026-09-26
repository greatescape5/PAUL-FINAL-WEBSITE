'use client';

import { useRef, useState } from 'react';
import { importSubscribers } from '@/lib/crm';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimal CSV field parser (handles quoted fields and escaped quotes).
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

function parseCsv(text: string): { email: string; name: string }[] {
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

export default function ImportSubscribersSheet({
  onClose, onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<{ email: string; name: string }[]>([]);
  const [group, setGroup] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number; invalid: number } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setFileName(f.name);
    setResult(null);
    try {
      const text = await f.text();
      const parsed = parseCsv(text);
      setRows(parsed);
      if (!group.trim()) setGroup((f.name.replace(/\.csv$/i, '').slice(0, 60)) || 'Imported list');
    } catch {
      alert('Could not read that file.');
    }
  }

  async function doImport() {
    if (!group.trim()) { alert('Give this group a name.'); return; }
    if (rows.length === 0) { alert('No valid emails found in the file.'); return; }
    setBusy(true);
    try {
      const r = await importSubscribers(rows, group.trim());
      setResult(r);
    } catch (e: any) {
      alert(e?.message ?? 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Import subscribers from CSV</h3>
        <p className="hint">
          A CSV with an <strong>email</strong> column (and optionally a <strong>name</strong> column).
          They&rsquo;re added to a group you name, and existing emails are skipped.
        </p>

        {result ? (
          <>
            <div className="import-result">
              <p><strong>{result.added}</strong> added to &ldquo;{group.trim()}&rdquo;.</p>
              {result.skipped > 0 && <p>{result.skipped} skipped (already on the list).</p>}
              {result.invalid > 0 && <p>{result.invalid} skipped (not a valid email).</p>}
            </div>
            <div className="sheet-actions">
              <button className="go" onClick={onDone}>Done</button>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Group name</label>
              <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. January mailing list" />
            </div>

            <div className="field">
              <label>CSV file</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" className="action-btn" onClick={() => fileRef.current?.click()}>Choose file</button>
                <span style={{ color: 'var(--crm-ink-soft)', fontSize: '0.9rem' }}>
                  {fileName ? `${fileName} — ${rows.length} email${rows.length === 1 ? '' : 's'} found` : 'No file chosen'}
                </span>
                <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
              </div>
            </div>

            <div className="sheet-actions">
              <button className="ghost" onClick={onClose}>Cancel</button>
              <button className="go" disabled={busy || rows.length === 0 || !group.trim()} onClick={doImport}>
                {busy ? 'Importing…' : `Import ${rows.length || ''} subscriber${rows.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
