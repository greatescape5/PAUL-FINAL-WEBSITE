'use client';

import { useState } from 'react';
import { importSubscribers } from '@/lib/crm';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Add subscribers to a group one at a time by typing a name + email.
export default function AddSubscriberSheet({
  group, onClose,
}: {
  group: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(false);

  async function add() {
    const e = email.trim();
    if (!EMAIL_RE.test(e)) { setErr(true); setMsg('Enter a valid email address.'); return; }
    setBusy(true); setErr(false); setMsg('');
    try {
      const r = await importSubscribers([{ email: e, name: name.trim() }], group);
      if (r.added) { setAdded((a) => a + 1); setEmail(''); setName(''); setMsg(`Added ${e}.`); }
      else if (r.skipped) { setErr(true); setMsg(`${e} is already on the list.`); }
      else { setErr(true); setMsg('Could not add that email.'); }
    } catch (e2: any) {
      setErr(true); setMsg(e2?.message ?? 'Could not add');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Add to &ldquo;{group}&rdquo;</h3>
        <p className="hint">Type a name and email. Add as many as you like, then close.</p>

        <div className="field">
          <label>Email</label>
          <input
            type="email" value={email} autoFocus
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <label>Name (optional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder="Full name"
          />
        </div>

        {msg && <p style={{ margin: '4px 0 0', color: err ? 'var(--red)' : '#10b981', fontSize: '0.9rem' }}>{msg}</p>}

        <div className="sheet-actions">
          <button className="ghost" onClick={onClose}>{added > 0 ? `Done (${added} added)` : 'Cancel'}</button>
          <button className="go" disabled={busy || !email.trim()} onClick={add}>{busy ? 'Adding…' : 'Add'}</button>
        </div>
      </div>
    </div>
  );
}
