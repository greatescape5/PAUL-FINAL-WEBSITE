'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CrmShell from '@/components/crm/CrmShell';
import { getToday, applyRateChange, type TodayItem } from '@/lib/crm';

function daysLabel(n: number) {
  if (n <= 0) return 'today';
  if (n === 1) return '1 day overdue';
  return `${n} days overdue`;
}

export default function TodayPage() {
  const router = useRouter();
  const [items, setItems] = useState<TodayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setItems(await getToday()); }
    catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function apply(rateChangeId: string) {
    setApplying(rateChangeId);
    try { await applyRateChange(rateChangeId); await load(); }
    catch (e: any) { alert(e?.message ?? 'Could not apply'); }
    finally { setApplying(null); }
  }

  const rateChanges = items.filter((i) => i.item_type === 'rate_change');
  const followUps = items.filter((i) => i.item_type === 'follow_up');
  const staleLeads = items.filter((i) => i.item_type === 'stale_lead');

  const go = (id: string) => router.push(`/admin/people/${id}`);

  return (
    <CrmShell title="Today">
      {loading ? (
        <div className="crm-loading">Loading…</div>
      ) : items.length === 0 ? (
        <div className="crm-empty">
          <div className="big">✅</div>
          <h2>You&rsquo;re all caught up</h2>
          <p>No overdue rate changes, no follow-ups due, no leads going cold. Nice work.</p>
        </div>
      ) : (
        <>
          {rateChanges.length > 0 && (
            <>
              <div className="crm-group-title money">
                Overdue rate changes <span className="count">{rateChanges.length}</span>
              </div>
              <div className="crm-card">
                {rateChanges.map((i) => (
                  <div key={i.item_id} className="crm-row" onClick={() => go(i.contact_id)}>
                    <div className="grow">
                      <div className="nm">{i.full_name}</div>
                      <div className="meta">{i.label}</div>
                    </div>
                    <div className="right">
                      <div className="overdue">{daysLabel(i.days_overdue)}</div>
                    </div>
                    <button
                      className="action-btn primary"
                      onClick={(e) => { e.stopPropagation(); apply(i.item_id); }}
                      disabled={applying === i.item_id}
                    >
                      {applying === i.item_id ? 'Applying…' : 'Mark applied'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {followUps.length > 0 && (
            <>
              <div className="crm-group-title">
                Follow-ups due <span className="count">{followUps.length}</span>
              </div>
              <div className="crm-card">
                {followUps.map((i) => (
                  <div key={i.item_id} className="crm-row" onClick={() => go(i.contact_id)}>
                    <div className="grow">
                      <div className="nm">{i.full_name}</div>
                      <div className="meta">{i.label}</div>
                    </div>
                    <div className="right overdue">{daysLabel(i.days_overdue)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {staleLeads.length > 0 && (
            <>
              <div className="crm-group-title">
                Stale leads <span className="count">{staleLeads.length}</span>
              </div>
              <div className="crm-card">
                {staleLeads.map((i) => (
                  <div key={i.item_id} className="crm-row" onClick={() => go(i.contact_id)}>
                    <div className="grow">
                      <div className="nm">{i.full_name}</div>
                      <div className="meta">{i.label}</div>
                    </div>
                    <div className="right">{daysLabel(i.days_overdue)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </CrmShell>
  );
}
