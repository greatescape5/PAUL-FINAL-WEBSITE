'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CrmShell from '@/components/crm/CrmShell';
import NewsletterComposer from '@/components/crm/NewsletterComposer';
import ImportSubscribersSheet from '@/components/crm/ImportSubscribersSheet';
import {
  getSubscribers, setSubscriberStatus, deleteSubscriber, updateSubscriberGroup, getBroadcasts,
  getGroups, createGroup,
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

type Filter = 'all' | 'subscribed' | 'unsubscribed' | 'groups' | 'history';

function toCsv(rows: Subscriber[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Email', 'Name', 'Group', 'Source', 'Signed up on page', 'Status', 'Date'];
  const lines = rows.map((r) => [
    esc(r.email),
    esc(r.name ?? ''),
    esc(r.group_name),
    esc(sourceLabel(r.source)),
    esc(landingPage(r) ?? ''),
    esc(r.status),
    esc(new Date(r.created_at).toISOString().slice(0, 10)),
  ].join(','));
  return [header.join(','), ...lines].join('\r\n');
}

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [groupDefs, setGroupDefs] = useState<string[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Broadcast | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await getSubscribers()); }
    catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  const loadGroups = useCallback(async () => {
    try { setGroupDefs(await getGroups()); } catch { setGroupDefs([]); }
  }, []);

  const loadBroadcasts = useCallback(async () => {
    try { setBroadcasts(await getBroadcasts()); } catch { setBroadcasts([]); }
  }, []);

  useEffect(() => { load(); loadGroups(); loadBroadcasts(); }, [load, loadGroups, loadBroadcasts]);

  const filtered = useMemo(() => {
    return rows.filter((r) =>
      (filter === 'all' || r.status === filter) &&
      (groupFilter === 'all' || r.group_name === groupFilter),
    );
  }, [rows, filter, groupFilter]);

  const activeCount = useMemo(() => rows.filter((r) => r.status === 'subscribed').length, [rows]);

  // Groups = defined groups ∪ any groups present on subscribers.
  const groups = useMemo(
    () => [...new Set([...groupDefs, ...rows.map((r) => r.group_name)])].sort(),
    [groupDefs, rows],
  );
  const groupCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) if (r.status === 'subscribed') m[r.group_name] = (m[r.group_name] ?? 0) + 1;
    return m;
  }, [rows]);
  const groupTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.group_name] = (m[r.group_name] ?? 0) + 1;
    return m;
  }, [rows]);

  async function addGroup() {
    const name = prompt('New group name:')?.trim();
    if (!name) return;
    if (groups.includes(name)) { alert('That group already exists.'); return; }
    try { await createGroup(name); await loadGroups(); }
    catch (e: any) { alert(e?.message ?? 'Could not create group'); }
  }

  async function moveGroup(sub: Subscriber, group: string) {
    if (group === sub.group_name) return;
    setBusyId(sub.id);
    try { await updateSubscriberGroup(sub.id, group); await load(); }
    catch (e: any) { alert(e?.message ?? 'Could not move'); }
    finally { setBusyId(null); }
  }

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

  function renderRow(s: Subscriber) {
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
            <span className="sub-group-tag">{s.group_name}</span>
            {s.name ? `${s.name} · ` : ''}{sourceLabel(s.source)}
            {lp ? ` · ${lp}` : ''}
          </div>
        </div>
        <select
          className="sub-group-select"
          value={s.group_name}
          onChange={(e) => moveGroup(s, e.target.value)}
          disabled={busyId === s.id}
          title="Move to group"
        >
          {[...new Set([...groups, s.group_name])].sort().map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
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
  }

  return (
    <CrmShell title="Subscriptions">
      <div className="crm-toolbar">
        <div className="seg">
          {([
            ['all', 'All'], ['subscribed', 'Subscribed'], ['unsubscribed', 'Unsubscribed'],
            ['groups', 'Groups'], ['history', 'History'],
          ] as [Filter, string][]).map(([f, label]) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => { setFilter(f); setOpenGroup(null); }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {filter === 'history' ? (
          <span style={{ color: 'var(--crm-ink-soft)', fontSize: '0.9rem' }}>
            {broadcasts.length} sent
          </span>
        ) : filter === 'groups' ? (
          <button className="action-btn primary" onClick={addGroup}>+ Add group</button>
        ) : (
          <>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'var(--crm-ink-soft)' }}>
              Group
              <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={{ width: 'auto', padding: '8px 10px' }}>
                <option value="all">All groups</option>
                {groups.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <span style={{ color: 'var(--crm-ink-soft)', fontSize: '0.9rem' }}>
              {activeCount} subscribed · {rows.length} total
            </span>
            <button className="action-btn" onClick={() => setImporting(true)}>Import CSV</button>
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
            totalActive={activeCount}
            groups={groups}
            groupCounts={groupCounts}
            initialGroup={groupFilter !== 'all' ? groupFilter : 'all'}
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
      ) : filter === 'groups' ? (
        openGroup ? (
          (() => {
            const members = rows.filter((r) => r.group_name === openGroup);
            const subs = members.filter((r) => r.status === 'subscribed');
            return (
              <>
                <div className="crm-toolbar" style={{ marginBottom: 14 }}>
                  <button className="crm-back" onClick={() => setOpenGroup(null)} style={{ cursor: 'pointer', background: 'none', border: 'none' }}>← All groups</button>
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{openGroup}</h2>
                  <div style={{ flex: 1 }} />
                  <span style={{ color: 'var(--crm-ink-soft)', fontSize: '0.9rem' }}>
                    {subs.length} subscribed · {members.length} total
                  </span>
                </div>
                {members.length === 0 ? (
                  <div className="crm-empty" style={{ padding: '50px 24px' }}>
                    <p>No one in this group yet. Import a CSV into it, or move subscribers here.</p>
                  </div>
                ) : (
                  <div className="crm-card">{members.map(renderRow)}</div>
                )}
              </>
            );
          })()
        ) : (
          <div className="pe-tiles">
            <button className="pe-tile pe-tile-add" onClick={addGroup}>+ Add group</button>
            {groups.map((g) => (
              <button key={g} className="pe-tile" onClick={() => setOpenGroup(g)}>
                <div className="pe-tile-name">{g}</div>
                <div className="pe-tile-meta">{groupCounts[g] ?? 0} subscribed · {groupTotals[g] ?? 0} total</div>
              </button>
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
          {filtered.map(renderRow)}
        </div>
      )}

      {importing && (
        <ImportSubscribersSheet
          onClose={() => setImporting(false)}
          onDone={() => { setImporting(false); load(); }}
        />
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
