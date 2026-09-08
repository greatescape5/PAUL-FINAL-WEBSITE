'use client';

import { useState } from 'react';
import { completeFollowUp } from '@/lib/crm';

// Marks a follow-up done and optionally schedules the next one in the same step.
// Shared by the Today screen and the contact detail page.
export default function CompleteFollowUpSheet({
  contactId, contactName, dueOn, onClose, onDone,
}: {
  contactId: string;
  contactName?: string;
  dueOn: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [next, setNext] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function complete() {
    setBusy(true);
    try {
      await completeFollowUp(contactId, dueOn, { note: note || undefined, nextDate: next || null });
      onDone();
    } catch (e: any) {
      alert(e?.message ?? 'Could not complete');
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Complete follow-up{contactName ? ` — ${contactName}` : ''}</h3>
        <p className="hint">Log it done, and optionally set the next follow-up right now.</p>
        <div className="field">
          <label>Next follow-up date (optional)</label>
          <input type="date" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="field">
          <label>Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened / what's next" />
        </div>
        <div className="sheet-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="go" disabled={busy} onClick={complete}>{busy ? 'Saving…' : 'Mark complete'}</button>
        </div>
      </div>
    </div>
  );
}
