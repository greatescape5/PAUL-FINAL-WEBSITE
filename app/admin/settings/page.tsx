'use client';

import { useCallback, useEffect, useState } from 'react';
import CrmShell from '@/components/crm/CrmShell';
import {
  getStages, createStage, updateStage, archiveStage,
  getPossibleDuplicates, mergeContacts,
  type Stage, type PossibleDuplicate,
} from '@/lib/crm';

export default function SettingsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [dupes, setDupes] = useState<PossibleDuplicate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStage, setNewStage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([getStages(), getPossibleDuplicates()]);
      setStages(s);
      setDupes(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveName(s: Stage, name: string) {
    if (!name.trim() || name === s.name) return;
    await updateStage(s.id, { name: name.trim() });
    load();
  }
  async function saveColor(s: Stage, color: string) {
    await updateStage(s.id, { color });
    load();
  }
  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= stages.length) return;
    const a = stages[idx], b = stages[target];
    await Promise.all([
      updateStage(a.id, { sort_order: b.sort_order }),
      updateStage(b.id, { sort_order: a.sort_order }),
    ]);
    load();
  }
  async function archive(s: Stage) {
    if (!confirm(`Archive "${s.name}"? New leads won't be able to land here.`)) return;
    await archiveStage(s.id);
    load();
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newStage.trim()) return;
    const nextOrder = stages.length ? Math.max(...stages.map((s) => s.sort_order)) + 10 : 10;
    await createStage(newStage.trim(), nextOrder);
    setNewStage('');
    load();
  }
  async function merge(d: PossibleDuplicate) {
    if (!confirm(`Merge "${d.name_b}" into "${d.name_a}"? This is reversible.`)) return;
    setBusy(true);
    try { await mergeContacts(d.contact_a, d.contact_b); await load(); }
    catch (e: any) { alert(e?.message ?? 'Could not merge'); }
    finally { setBusy(false); }
  }

  return (
    <CrmShell title="Settings">
      {loading ? (
        <div className="crm-loading">Loading…</div>
      ) : (
        <>
          <div className="crm-group-title">Pipeline stages</div>
          <div className="crm-card" style={{ padding: '8px 18px' }}>
            {stages.map((s, i) => (
              <div key={s.id} className="crm-row" style={{ cursor: 'default' }}>
                <input type="color" value={s.color} onChange={(e) => saveColor(s, e.target.value)}
                  style={{ width: 34, height: 34, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} />
                <input className="crm-search" defaultValue={s.name} onBlur={(e) => saveName(s, e.target.value)}
                  style={{ flex: 1, maxWidth: 320 }} />
                {s.is_default && <span className="lc-badge" style={{ background: 'var(--blue)' }}>Default</span>}
                {s.is_terminal && <span className="lc-badge" style={{ background: 'var(--crm-ink-mute)' }}>Terminal</span>}
                <div className="right" style={{ display: 'flex', gap: 6 }}>
                  <button className="action-btn" style={{ padding: '6px 10px' }} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button className="action-btn" style={{ padding: '6px 10px' }} disabled={i === stages.length - 1} onClick={() => move(i, 1)}>↓</button>
                  <button className="action-btn" style={{ padding: '6px 10px' }} onClick={() => archive(s)}>Archive</button>
                </div>
              </div>
            ))}
            <form onSubmit={add} style={{ display: 'flex', gap: 10, padding: '14px 0 6px' }}>
              <input className="crm-search" placeholder="New stage name…" value={newStage} onChange={(e) => setNewStage(e.target.value)} style={{ maxWidth: 320 }} />
              <button className="action-btn primary" type="submit">Add stage</button>
            </form>
          </div>

          <div className="crm-group-title" style={{ marginTop: 34 }}>
            Possible duplicates <span className="count">{dupes.length}</span>
          </div>
          <div className="crm-card">
            {dupes.length === 0 ? (
              <p style={{ color: 'var(--crm-ink-soft)', padding: '18px' }}>No duplicates found. 🎉</p>
            ) : (
              dupes.map((d, i) => (
                <div key={i} className="crm-row" style={{ cursor: 'default' }}>
                  <div className="grow">
                    <div className="nm">{d.name_a} &amp; {d.name_b}</div>
                    <div className="meta">Matched on {d.matched_on}</div>
                  </div>
                  <button className="action-btn primary" disabled={busy} onClick={() => merge(d)}>Merge</button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </CrmShell>
  );
}
