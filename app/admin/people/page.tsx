'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CrmShell from '@/components/crm/CrmShell';
import {
  getContacts, createContact, getStages, getTiers,
  LIFECYCLE_LABEL, LIFECYCLE_COLOR, LIFECYCLE_ORDER,
  type Contact, type Lifecycle, type Stage, type Tier,
} from '@/lib/crm';

const SEGMENTS: { key: Lifecycle; label: string }[] = [
  { key: 'client', label: 'Active' },
  { key: 'lead', label: 'Leads' },
  { key: 'paused', label: 'Paused' },
  { key: 'past_client', label: 'Past' },
];

const money = (n: number | null) => (n == null ? '—' : `$${Math.round(n).toLocaleString()}`);

// Is this tier name essentially just the price (e.g. seeded "$299")? If so we
// treat it as having no real package name and just show the price.
function priceLike(name: string, rate: number) {
  const n = name.trim().replace(/\/mo$/i, '').replace(/[$,\s]/g, '');
  return n === String(rate) || Number(n) === rate;
}

// Remember the People view (tab, sort, grouping, search) across navigation.
const VIEW_KEY = 'crm.people.view';
type SavedView = { seg?: Lifecycle; sort?: 'name' | 'tier'; q?: string; groupByStage?: boolean; stageFilter?: string };
function readView(): SavedView {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(sessionStorage.getItem(VIEW_KEY) || '{}'); } catch { return {}; }
}

export default function PeoplePage() {
  const router = useRouter();
  const [seg, setSeg] = useState<Lifecycle>(() => readView().seg ?? 'client');
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(() => readView().q ?? '');
  const [groupByStage, setGroupByStage] = useState(() => readView().groupByStage ?? true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [creating, setCreating] = useState(false);
  const [sort, setSort] = useState<'name' | 'tier'>(() => readView().sort ?? 'tier');
  const [stageFilter, setStageFilter] = useState<string>(() => readView().stageFilter ?? 'All');

  const load = useCallback(async (lc: Lifecycle) => {
    setLoading(true);
    try { setRows(await getContacts(lc)); }
    catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(seg); }, [seg, load]);
  useEffect(() => { getStages().then(setStages).catch(() => {}); }, []);
  useEffect(() => { getTiers().then(setTiers).catch(() => {}); }, []);

  // Persist the view so returning from a contact restores the same tab/sort.
  useEffect(() => {
    try { sessionStorage.setItem(VIEW_KEY, JSON.stringify({ seg, sort, q, groupByStage, stageFilter })); } catch { /* ignore */ }
  }, [seg, sort, q, groupByStage, stageFilter]);

  const filtered = useMemo(() => {
    let list = rows;
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((c) =>
        c.full_name.toLowerCase().includes(needle) ||
        (c.email ?? '').toLowerCase().includes(needle) ||
        (c.phone ?? '').includes(needle)
      );
    }
    if (seg === 'lead' && stageFilter !== 'All') {
      list = list.filter((c) => (c.stage_name ?? 'No stage') === stageFilter);
    }
    return list;
  }, [rows, q, seg, stageFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === 'tier') {
      // By tier = by monthly rate, highest first; no-rate contacts last;
      // name as the tiebreaker.
      arr.sort((a, b) => {
        const ra = a.monthly_rate, rb = b.monthly_rate;
        if (ra == null && rb == null) return a.full_name.localeCompare(b.full_name);
        if (ra == null) return 1;
        if (rb == null) return -1;
        return rb - ra || a.full_name.localeCompare(b.full_name);
      });
    } else {
      arr.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
    return arr;
  }, [filtered, sort]);

  const grouped = useMemo(() => {
    if (seg !== 'lead' || !groupByStage || stageFilter !== 'All') return null;
    const map = new Map<string, Contact[]>();
    for (const c of sorted) {
      const key = c.stage_name ?? 'No stage';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()];
  }, [sorted, seg, groupByStage, stageFilter]);

  // When sorting by tier, break the list into price-point groups (each with a
  // heading: the tier's package name + the price in gray).
  const tierGroups = useMemo(() => {
    if (sort !== 'tier') return null;
    const groups: { rate: number | null; items: Contact[] }[] = [];
    for (const c of sorted) {
      const r = c.monthly_rate == null ? null : Number(c.monthly_rate);
      const last = groups[groups.length - 1];
      if (last && last.rate === r) last.items.push(c);
      else groups.push({ rate: r, items: [c] });
    }
    return groups;
  }, [sorted, sort]);

  const go = (id: string) => router.push(`/admin/people/${id}`);

  function Row({ c }: { c: Contact }) {
    return (
      <div className="crm-row" onClick={() => go(c.id)}>
        <span className="lc-badge" style={{ background: LIFECYCLE_COLOR[c.lifecycle] }}>
          {LIFECYCLE_LABEL[c.lifecycle]}
        </span>
        <div className="grow">
          <div className="nm">{c.full_name}{c.needs_review && ' ⚠️'}</div>
          <div className="meta">{c.email || c.phone || 'No contact info'}</div>
        </div>
        <div className="right">
          {(c.lifecycle === 'client' || c.lifecycle === 'paused') && <span className="rate">{money(c.monthly_rate)}</span>}
          {c.lifecycle === 'lead' && c.stage_name && <span>{c.stage_name}</span>}
        </div>
      </div>
    );
  }

  return (
    <CrmShell title="People">
      <div className="crm-toolbar">
        <div className="seg">
          {SEGMENTS.map((s) => (
            <button key={s.key} className={seg === s.key ? 'active' : ''} onClick={() => { setSeg(s.key); setQ(''); }}>
              {s.label}
            </button>
          ))}
        </div>
        <input
          className="crm-search"
          placeholder="Search name, email, or phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {seg === 'lead' && stageFilter === 'All' && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'var(--crm-ink-soft)' }}>
            <input type="checkbox" checked={groupByStage} onChange={(e) => setGroupByStage(e.target.checked)} />
            Group by stage
          </label>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'var(--crm-ink-soft)' }}>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as 'name' | 'tier')} style={{ width: 'auto', padding: '8px 10px' }}>
            <option value="name">Name</option>
            <option value="tier">Tier (rate)</option>
          </select>
        </label>
        <button className="action-btn primary" onClick={() => setCreating(true)}>+ New contact</button>
      </div>

      {seg === 'lead' && stages.length > 0 && (
        <div className="seg" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          <button className={stageFilter === 'All' ? 'active' : ''} onClick={() => setStageFilter('All')}>All</button>
          {stages.map((s) => (
            <button key={s.id} className={stageFilter === s.name ? 'active' : ''} onClick={() => setStageFilter(s.name)}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="crm-loading">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="crm-empty" style={{ padding: '50px 24px' }}>
          <p>{q ? 'No matches.' : `No ${SEGMENTS.find((s) => s.key === seg)?.label.toLowerCase()} yet.`}</p>
        </div>
      ) : grouped ? (
        grouped.map(([stage, list]) => (
          <div key={stage}>
            <div className="crm-group-title">{stage} <span className="count">{list.length}</span></div>
            <div className="crm-card">{list.map((c) => <Row key={c.id} c={c} />)}</div>
          </div>
        ))
      ) : tierGroups ? (
        tierGroups.map((g, i) => {
          const t = g.rate == null ? undefined : tiers.find((x) => Number(x.price) === g.rate);
          const realName = t && g.rate != null && !priceLike(t.name, g.rate) ? t.name : null;
          const priceLabel = g.rate == null ? 'No rate set' : `${money(g.rate)}/mo`;
          return (
            <div key={i}>
              <div className="crm-group-title" style={{ textTransform: 'none', letterSpacing: 0, alignItems: 'baseline' }}>
                {realName && <span style={{ color: 'var(--crm-ink)', fontSize: '1rem' }}>{realName}</span>}
                <span style={{ color: 'var(--crm-ink-mute)', fontWeight: 500 }}>{priceLabel}</span>
                <span className="count">{g.items.length}</span>
              </div>
              <div className="crm-card">{g.items.map((c) => <Row key={c.id} c={c} />)}</div>
            </div>
          );
        })
      ) : (
        <div className="crm-card">{sorted.map((c) => <Row key={c.id} c={c} />)}</div>
      )}

      {creating && (
        <CreateSheet
          stages={stages}
          defaultLifecycle={seg}
          onClose={() => setCreating(false)}
          onCreated={(id) => router.push(`/admin/people/${id}`)}
        />
      )}
    </CrmShell>
  );
}

function CreateSheet({
  stages, defaultLifecycle, onClose, onCreated,
}: {
  stages: Stage[];
  defaultLifecycle: Lifecycle;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [lifecycle, setLifecycle] = useState<Lifecycle>(defaultLifecycle);
  const [stageId, setStageId] = useState('');
  const [rate, setRate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!stageId) setStageId(stages.find((s) => s.is_default)?.id ?? stages[0]?.id ?? '');
  }, [stages, stageId]);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { id } = await createContact({
        full_name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        lifecycle,
        stage_id: lifecycle === 'lead' ? (stageId || null) : null,
        monthly_rate: (lifecycle === 'client' || lifecycle === 'paused') && rate ? Number(rate) : null,
      });
      onCreated(id);
    } catch (e: any) {
      alert(e?.message ?? 'Could not create contact');
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>New contact</h3>
        <p className="hint">Met someone at the gym, a referral, a DM — add them here.</p>
        <div className="field"><label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoFocus /></div>
        <div className="field"><label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div className="field"><label>Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="208.555.0123" /></div>
        <div className="field"><label>Status</label>
          <select value={lifecycle} onChange={(e) => setLifecycle(e.target.value as Lifecycle)}>
            {LIFECYCLE_ORDER.map((lc) => <option key={lc} value={lc}>{LIFECYCLE_LABEL[lc]}</option>)}
          </select>
        </div>
        {lifecycle === 'lead' && stages.length > 0 && (
          <div className="field"><label>Stage</label>
            <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        {(lifecycle === 'client' || lifecycle === 'paused') && (
          <div className="field"><label>Monthly rate ($)</label>
            <input type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 199" /></div>
        )}
        <div className="sheet-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="go" disabled={busy || !name.trim()} onClick={submit}>{busy ? 'Adding…' : 'Add contact'}</button>
        </div>
      </div>
    </div>
  );
}
