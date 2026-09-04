'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CrmShell from '@/components/crm/CrmShell';
import {
  getContacts, createContact, getStages,
  LIFECYCLE_LABEL, LIFECYCLE_COLOR, LIFECYCLE_ORDER,
  type Contact, type Lifecycle, type Stage,
} from '@/lib/crm';

const SEGMENTS: { key: Lifecycle; label: string }[] = [
  { key: 'client', label: 'Active' },
  { key: 'lead', label: 'Leads' },
  { key: 'paused', label: 'Paused' },
  { key: 'past_client', label: 'Past' },
];

const money = (n: number | null) => (n == null ? '—' : `$${Math.round(n).toLocaleString()}`);

export default function PeoplePage() {
  const router = useRouter();
  const [seg, setSeg] = useState<Lifecycle>('client');
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [groupByStage, setGroupByStage] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (lc: Lifecycle) => {
    setLoading(true);
    try { setRows(await getContacts(lc)); }
    catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(seg); }, [seg, load]);
  useEffect(() => { getStages().then(setStages).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((c) =>
      c.full_name.toLowerCase().includes(needle) ||
      (c.email ?? '').toLowerCase().includes(needle) ||
      (c.phone ?? '').includes(needle)
    );
  }, [rows, q]);

  const grouped = useMemo(() => {
    if (seg !== 'lead' || !groupByStage) return null;
    const map = new Map<string, Contact[]>();
    for (const c of filtered) {
      const key = c.stage_name ?? 'No stage';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()];
  }, [filtered, seg, groupByStage]);

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
        {seg === 'lead' && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'var(--crm-ink-soft)' }}>
            <input type="checkbox" checked={groupByStage} onChange={(e) => setGroupByStage(e.target.checked)} />
            Group by stage
          </label>
        )}
        <button className="action-btn primary" onClick={() => setCreating(true)}>+ New contact</button>
      </div>

      {loading ? (
        <div className="crm-loading">Loading…</div>
      ) : filtered.length === 0 ? (
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
      ) : (
        <div className="crm-card">{filtered.map((c) => <Row key={c.id} c={c} />)}</div>
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
