'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CrmShell from '@/components/crm/CrmShell';
import NewsletterComposer from '@/components/crm/NewsletterComposer';
import {
  getSubscribers, setSubscriberStatus, deleteSubscriber, getBroadcasts,
  type Subscriber, type Broadcast,
} from '@/lib/crm';

// Friendly label for where someone signed up.
const SOURCE_LABEL: Record<string, string> = {
  popup: 'Newsletter popup',
  footer: 'Footer',
  website: 'Website',
  contact_form: 'Contact form',
};
function sourceLabel(s: string) {
  return SOURCE_LABEL[s] ?? (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Website');
}
function landingPage(sub: Subscriber): string | null {
  const lp = sub.source_detail?.['landing_page'];
  return typeof lp === 'string' ? lp : null;
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

type Filter = 'all' | 'subscribed' | 'unsubscribed' | 'history';

function toCsv(rows: Subscriber[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Email', 'Name', 'Source', 'Signed up on page', 'Status', 'Date'];
  const lines = rows.map((r) => [
    esc(r.email),
    esc(r.name ?? ''),
    esc(sourceLabel(r.source)),
    esc(landingPage(r) ?? ''),
    esc(r.status),
    esc(new Date(r.created_at).toISOString().slice(0, 10)),
  ].join(','));
  return [header.join(','), ...lines].join('\r\n');
}

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [viewing, setViewing] = useState<Broadcast | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await getSubscribers()); }
    catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  const loadBroadcasts = useCallback(async () => {
    try { setBroadcasts(await getBroadcasts()); } catch { setBroadcasts([]); }
  }, []);

  useEffect(() => { load(); loadBroadcasts(); }, [load, loadBroadcasts]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const activeCount = useMemo(() => rows.filter((r) => r.status === 'subscribed').length, [rows]);

  function exportCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-motion-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function toggleStatus(sub: Subscriber) {
    setBusyId(sub.id);
    try {
      await setSubscriberStatus(sub.id, sub.status === 'subscribed' ? 'unsubscribed' : 'subscribed');
      await load();
    } catch (e: any) { alert(e?.message ?? 'Could not update'); }
    finally { setBusyId(null); }
  }

  async function remove(sub: Subscriber) {
    if (!confirm(`Remove ${sub.email} from the list? This can't be undone.`)) return;
    setBusyId(sub.id);
    try { await deleteSubscriber(sub.id); await load(); }
    catch (e: any) { alert(e?.message ?? 'Could not delete'); }
    finally { setBusyId(null); }
  }

  return (
    <CrmShell title="Subscriptions">
      <div className="crm-toolbar">
        <div className="seg">
          {(['all', 'subscribed', 'unsubscribed', 'history'] as Filter[]).map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'subscribed' ? 'Subscribed' : f === 'unsubscribed' ? 'Unsubscribed' : 'History'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {filter === 'history' ? (
          <span style={{ color: 'var(--crm-ink-soft)', fontSize: '0.9rem' }}>
            {broadcasts.length} sent
          </span>
        ) : (
          <>
            <span style={{ color: 'var(--crm-ink-soft)', fontSize: '0.9rem' }}>
              {activeCount} subscribed · {rows.length} total
            </span>
            <button className="action-btn" onClick={exportCsv} disabled={filtered.length === 0}>
              Export CSV
            </button>
          </>
        )}
        <button className="action-btn primary" onClick={() => setComposing((v) => !v)}>
          {composing ? 'Close composer' : '✉ Compose newsletter'}
        </button>
      </div>

      {composing && (
        <div className="crm-card" style={{ padding: '20px 22px', marginBottom: 20 }}>
          <div className="crm-group-title" style={{ marginTop: 0 }}>New newsletter</div>
          <NewsletterComposer
            recipientCount={activeCount}
            onSent={(sent) => {
              setComposing(false);
              loadBroadcasts();
              alert(`Sent to ${sent} subscriber${sent === 1 ? '' : 's'}.`);
            }}
          />
        </div>
      )}

      {filter === 'history' ? (
        broadcasts.length === 0 ? (
          <div className="crm-empty" style={{ padding: '50px 24px' }}>
            <p>No newsletters sent yet. Compose one to get started.</p>
          </div>
        ) : (
          <div className="crm-card">
            {broadcasts.map((b) => (
              <div key={b.id} className="crm-row" onClick={() => setViewing(b)} style={{ cursor: 'pointer' }}>
                <span className="lc-badge" style={{ background: 'var(--blue)' }}>Sent</span>
                <div className="grow">
                  <div className="nm">{b.subject}</div>
                  <div className="meta">{b.sent_count} recipient{b.sent_count === 1 ? '' : 's'}</div>
                </div>
                <div className="right" style={{ color: 'var(--crm-ink-soft)' }}>{fmtDateTime(b.sent_at)}</div>
              </div>
            ))}
          </div>
        )
      ) : loading ? (
        <div className="crm-loading">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="crm-empty" style={{ padding: '50px 24px' }}>
          <p>No subscribers{filter !== 'all' ? ` in “${filter}”` : ' yet'}.</p>
        </div>
      ) : (
        <div className="crm-card">
          {filtered.map((s) => {
            const lp = landingPage(s);
            return (
              <div key={s.id} className="crm-row" style={{ cursor: 'default' }}>
                <span
                  className="lc-badge"
                  style={{ background: s.status === 'subscribed' ? '#10b981' : 'var(--crm-ink-mute)' }}
                >
                  {s.status === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}
                </span>
                <div className="grow">
                  <div className="nm">{s.email}</div>
                  <div className="meta">
                    {s.name ? `${s.name} · ` : ''}{sourceLabel(s.source)}
                    {lp ? ` · ${lp}` : ''}
                  </div>
                </div>
                <div className="right" style={{ color: 'var(--crm-ink-soft)' }}>{fmtDate(s.created_at)}</div>
                <button
                  className="action-btn"
                  onClick={() => toggleStatus(s)}
                  disabled={busyId === s.id}
                  title={s.status === 'subscribed' ? 'Mark unsubscribed' : 'Re-subscribe'}
                >
                  {s.status === 'subscribed' ? 'Unsubscribe' : 'Re-subscribe'}
                </button>
                <button className="action-btn" style={{ padding: '6px 10px' }} title="Delete" onClick={() => remove(s)} disabled={busyId === s.id}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {viewing && (
        <div className="sheet-backdrop" onClick={() => setViewing(null)}>
          <div className="nl-history-modal" onClick={(e) => e.stopPropagation()}>
            <button className="newsletter-pop-close" onClick={() => setViewing(null)} aria-label="Close">×</button>
            <h3 style={{ margin: '0 6px 4px 0' }}>{viewing.subject}</h3>
            <div className="meta" style={{ color: 'var(--crm-ink-soft)', marginBottom: 14 }}>
              Sent {fmtDateTime(viewing.sent_at)} · {viewing.sent_count} recipient{viewing.sent_count === 1 ? '' : 's'}
            </div>
            <iframe className="nl-preview-frame" srcDoc={viewing.body_html} title="Newsletter preview" />
            <div className="crm-group-title" style={{ marginTop: 22 }}>
              Sent to <span className="count">{viewing.recipients?.length ?? 0}</span>
            </div>
            {viewing.recipients && viewing.recipients.length > 0 ? (
              <ul className="nl-recipients">
                {viewing.recipients.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            ) : (
              <p style={{ color: 'var(--crm-ink-mute)', margin: 0 }}>
                Recipient list wasn&rsquo;t recorded for this send.
              </p>
            )}
          </div>
        </div>
      )}
    </CrmShell>
  );
}
