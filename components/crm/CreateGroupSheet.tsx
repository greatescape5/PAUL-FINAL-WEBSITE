'use client';

import { useRef, useState } from 'react';
import { createGroup, importSubscribers } from '@/lib/crm';
import { parseCsv } from '@/lib/csv';

// Clean "new group" sheet: name the group and optionally seed it from a CSV.
export default function CreateGroupSheet({
  existingGroups, onClose, onCreated,
}: {
  existingGroups: string[];
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<{ email: string; name: string }[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setFileName(f.name);
    try {
      setRows(parseCsv(await f.text()));
    } catch {
      alert('Could not read that file.');
    }
  }

  async function create() {
    const n = name.trim();
    if (!n) { alert('Give the group a name.'); return; }
    if (existingGroups.includes(n)) { alert('That group already exists.'); return; }
    setBusy(true);
    try {
      await createGroup(n);
      if (rows.length) await importSubscribers(rows, n);
      onCreated(n);
    } catch (e: any) {
      alert(e?.message ?? 'Could not create the group');
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>New group</h3>
        <p className="hint">Name the group, and optionally add subscribers from a CSV now (you can also add them later).</p>

        <div className="field">
          <label>Group name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. January mailing list" autoFocus />
        </div>

        <div className="field">
          <label>Add from CSV (optional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="action-btn" onClick={() => fileRef.current?.click()}>Choose file</button>
            <span style={{ color: 'var(--crm-ink-soft)', fontSize: '0.9rem' }}>
              {fileName ? `${fileName} — ${rows.length} email${rows.length === 1 ? '' : 's'} found` : 'No file chosen'}
            </span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          </div>
        </div>

        {rows.length > 0 && (
          <div className="field">
            <div className="import-preview">
              <table>
                <thead><tr><th>Email</th><th>Name</th></tr></thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}><td>{r.email}</td><td>{r.name || <span style={{ color: 'var(--crm-ink-mute)' }}>—</span>}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="sheet-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="go" disabled={busy || !name.trim()} onClick={create}>
            {busy ? 'Creating…' : rows.length ? `Create & add ${rows.length}` : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  );
}
