'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import CrmShell from '@/components/crm/CrmShell';
import {
  getContact, setLifecycle, undoLastChange, scheduleRateChange, addNote,
  setFollowUp, clearReview,
  LIFECYCLE_LABEL, LIFECYCLE_COLOR, LIFECYCLE_ORDER,
  type Contact, type Activity, type RateChange, type Lifecycle,
} from '@/lib/crm';

const money = (n: number | null | undefined) => (n == null ? '—' : `$${Math.round(n).toLocaleString()}`);
const today = () => new Date().toISOString().slice(0, 10);

function fmt(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// Human label for a timeline entry.
function activityText(a: Activity): { kind: string; text: string } {
  const m = a.meta as Record<string, any>;
  switch (a.kind) {
    case 'note': return { kind: 'Note', text: a.body ?? '' };
    case 'lifecycle_change': return { kind: 'Status changed', text: `${LIFECYCLE_LABEL[m.from as Lifecycle] ?? m.from} → ${LIFECYCLE_LABEL[m.to as Lifecycle] ?? m.to}${a.body ? ` · ${a.body}` : ''}` };
    case 'stage_change': return { kind: 'Stage changed', text: a.body ?? '' };
    case 'rate_change': return { kind: 'Rate change applied', text: `${money(m.from)} → ${money(m.to)}${a.body ? ` · ${a.body}` : ''}` };
    case 'form_submission': return { kind: 'Contact form', text: 'Submitted the website contact form' };
    case 'merge': return { kind: 'Merged', text: a.body ?? 'Duplicate merged in' };
    case 'unmerge': return { kind: 'Unmerged', text: a.body ?? 'Merge reversed' };
    default: return { kind: 'Update', text: a.body ?? '' };
  }
}

type Sheet = null | 'status' | 'followup' | 'rate' | 'note';

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [rateChanges, setRateChanges] = useState<RateChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getContact(id);
      setContact(d.contact);
      setActivities(d.activities);
      setRateChanges(d.rateChanges);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const undoable = activities.find(
    (a) => !a.undone_at && ['lifecycle_change', 'stage_change', 'rate_change'].includes(a.kind),
  );

  async function runUndo() {
    setBusy(true);
    try { await undoLastChange(id); await load(); }
    catch (e: any) { alert(e?.message ?? 'Could not undo'); }
    finally { setBusy(false); }
  }

  async function dismissReview() {
    setBusy(true);
    try { await clearReview(id); await load(); }
    finally { setBusy(false); }
  }

  if (loading) return <CrmShell title="Contact"><div className="crm-loading">Loading…</div></CrmShell>;
  if (notFound || !contact) return <CrmShell title="Contact"><div className="crm-loading">Contact not found. <Link href="/admin/people">Back to People</Link></div></CrmShell>;

  const c = contact;
  const phoneHref = c.phone ? `tel:${c.phone.replace(/[^+\d]/g, '')}` : null;

  return (
    <CrmShell title="Contact">
      <Link href="/admin/people" className="crm-back">← People</Link>

      {c.needs_review && (
        <div className="review-banner">
          <span>⚠️</span>
          <div className="msg">{c.needs_review}</div>
          <button onClick={dismissReview} disabled={busy}>Looks right</button>
        </div>
      )}

      {undoable && (
        <div className="undo-bar">
          <span>Last change: {activityText(undoable).kind.toLowerCase()} · {fmt(undoable.created_at)}</span>
          <button onClick={runUndo} disabled={busy}>Undo</button>
        </div>
      )}

      <div className="crm-card" style={{ padding: '22px 24px' }}>
        <div className="contact-head">
          <div>
            <span className="lc-badge" style={{ background: LIFECYCLE_COLOR[c.lifecycle] }}>{LIFECYCLE_LABEL[c.lifecycle]}</span>
            <h2 style={{ margin: '10px 0 0' }}>{c.full_name}</h2>
            <div className="contact-meta">
              {c.email && <a href={`mailto:${c.email}`}>✉️ {c.email}</a>}
              {c.phone && phoneHref && <a href={phoneHref}>📞 {c.phone}</a>}
              {c.stage_name && c.lifecycle === 'lead' && <span>Stage: {c.stage_name}</span>}
            </div>
          </div>
          {(c.lifecycle === 'client' || c.lifecycle === 'paused') && (
            <div style={{ textAlign: 'right' }}>
              <div className="rate-big">{money(c.monthly_rate)}</div>
              <div className="meta" style={{ color: 'var(--crm-ink-soft)', fontSize: '0.85rem' }}>per month · {c.payment_method}</div>
            </div>
          )}
        </div>

        {c.expected_return && c.lifecycle === 'paused' && (
          <p style={{ color: 'var(--crm-ink-soft)', margin: '14px 0 0', fontSize: '0.92rem' }}>
            Expected back <strong>{c.expected_return}</strong>
          </p>
        )}
        {c.follow_up_on && (
          <p style={{ color: 'var(--crm-ink-soft)', margin: '6px 0 0', fontSize: '0.92rem' }}>
            Follow-up on <strong>{c.follow_up_on}</strong>
          </p>
        )}

        <div className="action-row">
          <button className="action-btn primary" onClick={() => setSheet('status')}>Change status</button>
          <button className="action-btn" onClick={() => setSheet('followup')}>Set follow-up</button>
          <button className="action-btn" onClick={() => setSheet('rate')}>Schedule rate change</button>
          <button className="action-btn" onClick={() => setSheet('note')}>Add note</button>
        </div>
      </div>

      {/* Pending scheduled rate changes */}
      {rateChanges.filter((r) => !r.applied_at && !r.cancelled_at).length > 0 && (
        <>
          <div className="crm-group-title">Scheduled rate changes</div>
          <div className="crm-card">
            {rateChanges.filter((r) => !r.applied_at && !r.cancelled_at).map((r) => (
              <div key={r.id} className="crm-row" style={{ cursor: 'default' }}>
                <div className="grow"><div className="nm">{money(r.from_rate)} → {money(r.to_rate)}</div>{r.reason && <div className="meta">{r.reason}</div>}</div>
                <div className="right">effective {r.effective_on}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Timeline */}
      <div className="crm-group-title">Activity</div>
      <div className="crm-card" style={{ padding: '4px 22px 8px' }}>
        {activities.length === 0 ? (
          <p style={{ color: 'var(--crm-ink-soft)', padding: '16px 0' }}>No activity yet.</p>
        ) : (
          <div className="timeline">
            {activities.map((a) => {
              const t = activityText(a);
              return (
                <div key={a.id} className={`tl-item${a.undone_at ? ' undone' : ''}`}>
                  <span className="tl-dot" style={{ background: a.kind === 'rate_change' ? 'var(--red)' : 'var(--blue)' }} />
                  <div className="tl-body">
                    <div className="tl-kind">{t.kind}{a.undone_at ? ' (undone)' : ''}</div>
                    {t.text && <div className="tl-text">{t.text}</div>}
                    <div className="tl-time">{fmt(a.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sheet && (
        <ActionSheet
          kind={sheet}
          contact={c}
          busy={busy}
          onClose={() => setSheet(null)}
          onDone={async (fn) => {
            setBusy(true);
            try { await fn(); setSheet(null); await load(); }
            catch (e: any) { alert(e?.message ?? 'Something went wrong'); }
            finally { setBusy(false); }
          }}
        />
      )}
    </CrmShell>
  );
}

// ---------------------------------------------------------------------------
// Action sheets
// ---------------------------------------------------------------------------
function ActionSheet({
  kind, contact, busy, onClose, onDone,
}: {
  kind: Exclude<Sheet, null>;
  contact: Contact;
  busy: boolean;
  onClose: () => void;
  onDone: (fn: () => Promise<unknown>) => void;
}) {
  const c = contact;
  const [lifecycle, setLifecycleChoice] = useState<Lifecycle>(c.lifecycle);
  const [expectedReturn, setExpectedReturn] = useState('');
  const [note, setNote] = useState('');
  const [followUp, setFollowUpDate] = useState(c.follow_up_on ?? '');
  const [rate, setRate] = useState('');
  const [effective, setEffective] = useState(today());
  const [reason, setReason] = useState('');

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {kind === 'status' && (
          <>
            <h3>Change status</h3>
            <p className="hint">Nothing is lost — you can undo this in one tap.</p>
            <div className="opt-grid">
              {LIFECYCLE_ORDER.map((lc) => (
                <button key={lc} className={`opt${lifecycle === lc ? ' on' : ''}`} onClick={() => setLifecycleChoice(lc)}>
                  <span className="swatch" style={{ background: LIFECYCLE_COLOR[lc] }} />
                  {LIFECYCLE_LABEL[lc]}
                </button>
              ))}
            </div>
            {lifecycle === 'paused' && (
              <div className="field">
                <label>Expected return date</label>
                <input type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>Note (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. knee injury, back in ~6 weeks" />
            </div>
            <div className="sheet-actions">
              <button className="ghost" onClick={onClose}>Cancel</button>
              <button className="go" disabled={busy || lifecycle === c.lifecycle}
                onClick={() => onDone(() => setLifecycle(c.id, lifecycle, { note: note || undefined, expectedReturn: expectedReturn || undefined }))}>
                Save
              </button>
            </div>
          </>
        )}

        {kind === 'followup' && (
          <>
            <h3>Set follow-up date</h3>
            <p className="hint">This shows up on Today when it comes due.</p>
            <div className="field">
              <label>Follow up on</label>
              <input type="date" value={followUp} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
            <div className="sheet-actions">
              <button className="ghost" onClick={() => onDone(() => setFollowUp(c.id, null))}>Clear</button>
              <button className="go" disabled={busy || !followUp} onClick={() => onDone(() => setFollowUp(c.id, followUp))}>Save</button>
            </div>
          </>
        )}

        {kind === 'rate' && (
          <>
            <h3>Schedule rate change</h3>
            <p className="hint">Appears on Today when due. You confirm it once you&rsquo;ve updated Stripe.</p>
            <div className="field">
              <label>New monthly rate ($)</label>
              <input type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 299" />
            </div>
            <div className="field">
              <label>Effective date</label>
              <input type="date" value={effective} onChange={(e) => setEffective(e.target.value)} />
            </div>
            <div className="field">
              <label>Reason (optional)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. return to original price" />
            </div>
            <div className="sheet-actions">
              <button className="ghost" onClick={onClose}>Cancel</button>
              <button className="go" disabled={busy || !rate || !effective}
                onClick={() => onDone(() => scheduleRateChange(c.id, Number(rate), effective, reason || undefined))}>
                Schedule
              </button>
            </div>
          </>
        )}

        {kind === 'note' && (
          <>
            <h3>Add note</h3>
            <div className="field">
              <label>Note</label>
              <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened / what to remember…" />
            </div>
            <div className="sheet-actions">
              <button className="ghost" onClick={onClose}>Cancel</button>
              <button className="go" disabled={busy || !note.trim()} onClick={() => onDone(() => addNote(c.id, note.trim()))}>Save</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
