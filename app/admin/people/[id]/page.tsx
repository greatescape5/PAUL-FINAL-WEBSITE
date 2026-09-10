'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import CrmShell from '@/components/crm/CrmShell';
import CompleteFollowUpSheet from '@/components/crm/CompleteFollowUpSheet';
import CompleteCheckInSheet from '@/components/crm/CompleteCheckInSheet';
import {
  getContact, setLifecycle, undoLastChange, scheduleRateChange, setRateNow, addNote,
  setFollowUp, clearReview, setStage, getStages, getTiers,
  getCheckIns, addCheckIn, deleteCheckIn, checkInNoteLabels,
  getFollowUps,
  LIFECYCLE_LABEL, LIFECYCLE_COLOR, LIFECYCLE_ORDER,
  type Contact, type Activity, type RateChange, type Lifecycle, type CheckIn, type FollowUp, type Stage, type Tier,
} from '@/lib/crm';

// Common accountability check-in types (matches how the legacy sheet was used).
const CHECKIN_KINDS = ['Face call check-in', 'Thank you', 'Text check-in', 'Progress review', 'Nutrition check-in'];

const money = (n: number | null | undefined) => (n == null ? '—' : `$${Math.round(n).toLocaleString()}`);
const today = () => new Date().toISOString().slice(0, 10);

// A tier name that's essentially just its price (e.g. seeded "$299") has no
// real package name — show the price alone in that case.
function priceLike(name: string, rate: number) {
  const n = name.trim().replace(/\/mo$/i, '').replace(/[$,\s]/g, '');
  return n === String(rate) || Number(n) === rate;
}
function tierLabel(t: Tier) {
  return priceLike(t.name, t.price) ? `${money(t.price)}/mo` : `${t.name} — ${money(t.price)}/mo`;
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// Date-only ('YYYY-MM-DD'), parsed locally to avoid a UTC off-by-one.
function fmtDay(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [addingCheckIn, setAddingCheckIn] = useState(false);
  const [completingFu, setCompletingFu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completingCheckIn, setCompletingCheckIn] = useState<CheckIn | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);

  const load = useCallback(async () => {
    try {
      const d = await getContact(id);
      setContact(d.contact);
      setActivities(d.activities);
      setRateChanges(d.rateChanges);
      // Check-ins + follow-up log load separately so a missing table (before
      // migrations 0005/0006) doesn't blank the page.
      try { setCheckIns(await getCheckIns(id)); } catch { setCheckIns([]); }
      try { setFollowUps(await getFollowUps(id)); } catch { setFollowUps([]); }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getStages().then(setStages).catch(() => {}); }, []);
  useEffect(() => { getTiers().then(setTiers).catch(() => {}); }, []);

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

  async function removeCheckIn(ci: CheckIn) {
    if (!confirm(`Delete this "${ci.kind}" check-in?`)) return;
    try { await deleteCheckIn(ci.id); await load(); }
    catch (e: any) { alert(e?.message ?? 'Could not delete'); }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0 0' }}>
            <span style={{ color: 'var(--crm-ink-soft)', fontSize: '0.92rem' }}>
              Follow-up on <strong>{fmtDay(c.follow_up_on)}</strong>
            </span>
            <button className="action-btn primary" style={{ padding: '6px 14px' }} onClick={() => setCompletingFu(true)}>
              Mark done
            </button>
          </div>
        )}

        <div className="action-row">
          <button className="action-btn primary" onClick={() => setSheet('status')}>Change status</button>
          <button className="action-btn" onClick={() => setAddingCheckIn(true)}>Add check-in</button>
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

      {/* Completed follow-ups (their own area) */}
      {followUps.length > 0 && (
        <>
          <div className="crm-group-title">Follow-ups <span className="count">{followUps.length}</span></div>
          <div className="crm-card">
            {followUps.map((f) => (
              <div key={f.id} className="crm-row" style={{ cursor: 'default' }}>
                <span className="lc-badge" style={{ background: '#10b981' }}>Done</span>
                <div className="grow">
                  {f.due_on && <div className="meta">Was due {fmtDay(f.due_on)}</div>}
                  {f.note && <div className="meta">{f.note}</div>}
                </div>
                <div className="right">Completed {fmtDay(f.completed_on)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Accountability check-ins */}
      <div className="crm-group-title">
        Accountability check-ins{checkIns.length > 0 && <span className="count" style={{ marginLeft: 8 }}>{checkIns.length}</span>}
      </div>
      <div className="crm-card">
        {checkIns.length === 0 ? (
          <p style={{ color: 'var(--crm-ink-soft)', padding: '16px 18px' }}>No check-ins logged yet.</p>
        ) : (
          checkIns.map((ci) => {
            const pending = ci.completed_at == null;
            const labels = checkInNoteLabels(ci.kind);
            return (
              <div key={ci.id} className="crm-row" style={{ cursor: 'default' }}>
                <span className="lc-badge" style={{ background: pending ? 'var(--blue)' : 'var(--blue-soft)' }}>{ci.kind}</span>
                <div className="grow">
                  {ci.note && <div className="meta"><b>{labels.pre}:</b> {ci.note}</div>}
                  {ci.post_note && <div className="meta"><b>{labels.post}:</b> {ci.post_note}</div>}
                </div>
                <div className="right">{pending ? `Due ${fmtDay(ci.done_on)}` : fmtDay(ci.done_on)}</div>
                {pending && (
                  <button
                    className="action-btn primary"
                    style={{ padding: '6px 10px' }}
                    onClick={() => setCompletingCheckIn(ci)}
                  >
                    Mark done
                  </button>
                )}
                <button className="action-btn" style={{ padding: '6px 10px' }} title="Delete check-in" onClick={() => removeCheckIn(ci)}>×</button>
              </div>
            );
          })
        )}
      </div>

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
          stages={stages}
          tiers={tiers}
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

      {addingCheckIn && (
        <CheckInSheet
          contactId={id}
          onClose={() => setAddingCheckIn(false)}
          onSaved={() => { setAddingCheckIn(false); load(); }}
        />
      )}

      {completingFu && (
        <CompleteFollowUpSheet
          contactId={id}
          contactName={c.full_name}
          dueOn={c.follow_up_on}
          onClose={() => setCompletingFu(false)}
          onDone={() => { setCompletingFu(false); load(); }}
        />
      )}

      {completingCheckIn && (
        <CompleteCheckInSheet
          checkInId={completingCheckIn.id}
          kind={completingCheckIn.kind}
          contactName={c.full_name}
          onClose={() => setCompletingCheckIn(null)}
          onDone={() => { setCompletingCheckIn(null); load(); }}
        />
      )}
    </CrmShell>
  );
}

// ---------------------------------------------------------------------------
// Add check-in sheet
// ---------------------------------------------------------------------------
function CheckInSheet({
  contactId, onClose, onSaved,
}: {
  contactId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState(CHECKIN_KINDS[0]);
  const [custom, setCustom] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const isCustom = kind === '__custom';
  const preLabel = checkInNoteLabels(isCustom ? custom : kind).pre;

  async function save() {
    const k = isCustom ? custom.trim() : kind;
    if (!k) return;
    setBusy(true);
    try { await addCheckIn(contactId, k, date, note || undefined); onSaved(); }
    catch (e: any) { alert(e?.message ?? 'Could not save'); setBusy(false); }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Add check-in</h3>
        <div className="field">
          <label>Type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {CHECKIN_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            <option value="__custom">Custom…</option>
          </select>
        </div>
        {isCustom && (
          <div className="field"><label>Custom type</label>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Quarterly call" autoFocus /></div>
        )}
        <div className="field"><label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field"><label>{preLabel} (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything to remember" /></div>
        <div className="sheet-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="go" disabled={busy || (isCustom && !custom.trim())} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action sheets
// ---------------------------------------------------------------------------
function ActionSheet({
  kind, contact, stages, tiers, busy, onClose, onDone,
}: {
  kind: Exclude<Sheet, null>;
  contact: Contact;
  stages: Stage[];
  tiers: Tier[];
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
  const [rateTierId, setRateTierId] = useState('');
  const [effective, setEffective] = useState(today());
  const [reason, setReason] = useState('');
  const [stageId, setStageId] = useState<string>(c.stage_id ?? '');

  const isCustomRate = rateTierId === '__custom';
  const selectedTier = tiers.find((t) => t.id === rateTierId);
  const newRate = isCustomRate ? (rate ? Number(rate) : null) : (selectedTier?.price ?? null);

  // When switching to "lead", default the stage picker to the pipeline's first stage.
  useEffect(() => {
    if (lifecycle === 'lead' && !stageId) {
      setStageId(stages.find((s) => s.is_default)?.id ?? stages[0]?.id ?? '');
    }
  }, [lifecycle, stages, stageId]);

  const lifeChanged = lifecycle !== c.lifecycle;
  const stageChanged = lifecycle === 'lead' && !!stageId && stageId !== (c.stage_id ?? '');
  const rateChosen = lifecycle === 'client' && newRate != null && newRate !== (c.monthly_rate ?? null);
  const canSaveStatus = lifeChanged || stageChanged || rateChosen;

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
            {lifecycle === 'lead' && stages.length > 0 && (
              <div className="field">
                <label>Sales stage</label>
                <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            {lifecycle === 'client' && (
              <>
                <div className="field">
                  <label>Package{c.monthly_rate != null ? ` (currently ${money(c.monthly_rate)}/mo)` : ''}</label>
                  <select value={rateTierId} onChange={(e) => setRateTierId(e.target.value)}>
                    <option value="">{c.monthly_rate != null ? 'Keep current rate' : 'Choose a package…'}</option>
                    {tiers.map((t) => <option key={t.id} value={t.id}>{tierLabel(t)}</option>)}
                    <option value="__custom">Custom amount…</option>
                  </select>
                </div>
                {isCustomRate && (
                  <div className="field">
                    <label>Custom monthly rate ($)</label>
                    <input type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 199" autoFocus />
                  </div>
                )}
              </>
            )}
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
              <button className="go" disabled={busy || !canSaveStatus}
                onClick={() => onDone(async () => {
                  if (lifeChanged) await setLifecycle(c.id, lifecycle, { note: note || undefined, expectedReturn: expectedReturn || undefined });
                  if (stageChanged) await setStage(c.id, stageId, lifeChanged ? undefined : (note || undefined));
                  if (rateChosen && newRate != null) await setRateNow(c.id, newRate);
                })}>
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
              <label>New package</label>
              <select value={rateTierId} onChange={(e) => setRateTierId(e.target.value)}>
                <option value="" disabled>Choose a package…</option>
                {tiers.map((t) => <option key={t.id} value={t.id}>{tierLabel(t)}</option>)}
                <option value="__custom">Custom amount…</option>
              </select>
            </div>
            {isCustomRate && (
              <div className="field">
                <label>Custom monthly rate ($)</label>
                <input type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 299" autoFocus />
              </div>
            )}
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
              <button className="go" disabled={busy || newRate == null || !effective}
                onClick={() => onDone(() => scheduleRateChange(c.id, newRate!, effective, reason || undefined))}>
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
