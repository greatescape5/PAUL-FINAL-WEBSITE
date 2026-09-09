'use client';

import { useState } from 'react';
import { completeCheckIn } from '@/lib/crm';

// Marks a scheduled check-in done and optionally schedules the next one in the
// same step. Shared by the Today screen and the contact detail page.
export default function CompleteCheckInSheet({
  checkInId, kind, contactName, onClose, onDone,
}: {
  checkInId: string;
  kind?: string;
  contactName?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [next, setNext] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function complete() {
    setBusy(true);
    try {
      await completeCheckIn(checkInId, { note: note || undefined, nextDate: next || null });
      onDone();
    } catch (e: any) {
      alert(e?.message ?? 'Could not complete');
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Complete check-in{contactName ? ` — ${contactName}` : ''}</h3>
        <p className="hint">Log it done{kind ? ` (${kind})` : ''}, and optionally schedule the next one right now.</p>
        <div className="field">
          <label>Next check-in date (optional)</label>
          <input type="date" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="field">
          <label>Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did it go / what's next" />
        </div>
        <div className="sheet-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="go" disabled={busy} onClick={complete}>{busy ? 'Saving…' : 'Mark complete'}</button>
        </div>
      </div>
    </div>
  );
}
