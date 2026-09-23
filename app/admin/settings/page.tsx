'use client';

import { useCallback, useEffect, useState } from 'react';
import CrmShell from '@/components/crm/CrmShell';
import {
  getStages, createStage, updateStage, archiveStage,
  getTiers, createTier, updateTier, archiveTier,
  getPossibleDuplicates, mergeContacts,
  getNewsletterCtas, createNewsletterCta, updateNewsletterCta, deleteNewsletterCta,
  type Stage, type Tier, type PossibleDuplicate, type NewsletterCta,
} from '@/lib/crm';

export default function SettingsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [dupes, setDupes] = useState<PossibleDuplicate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStage, setNewStage] = useState('');
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'tiers' | 'stages' | 'cta' | 'duplicates'>('tiers');
  const [ctas, setCtas] = useState<NewsletterCta[]>([]);
  const emptyCta = { name: '', price_display: '', description: '', button_label: 'Sign up', signup_url: '' };
  const [newCta, setNewCta] = useState(emptyCta);
  const [addingCta, setAddingCta] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([getStages(), getPossibleDuplicates()]);
      setStages(s);
      setDupes(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // Tiers load separately so a missing tiers table (before migration 0003 is
  // run) can't blank out the rest of the page.
  const loadTiers = useCallback(async () => {
    try { setTiers(await getTiers()); } catch { setTiers([]); }
  }, []);

  const loadCtas = useCallback(async () => {
    try { setCtas(await getNewsletterCtas()); } catch { setCtas([]); }
  }, []);

  useEffect(() => { load(); loadTiers(); loadCtas(); }, [load, loadTiers, loadCtas]);

  // ---- Newsletter sign-up CTAs ----
  async function addCta(e: React.FormEvent) {
    e.preventDefault();
    if (!newCta.name.trim()) { alert('Give the CTA a name.'); return; }
    setAddingCta(true);
    try {
      await createNewsletterCta({
        name: newCta.name.trim(),
        price_display: newCta.price_display.trim(),
        description: newCta.description.trim(),
        button_label: newCta.button_label.trim() || 'Sign up',
        signup_url: newCta.signup_url.trim(),
      });
      setNewCta(emptyCta);
      loadCtas();
    } catch (e: any) { alert(e?.message ?? 'Could not save'); }
    finally { setAddingCta(false); }
  }
  async function saveCtaField(c: NewsletterCta, key: keyof Omit<NewsletterCta, 'id'>, value: string) {
    const v = value.trim();
    if (v === (c[key] ?? '')) return;
    try { await updateNewsletterCta(c.id, { [key]: v }); loadCtas(); }
    catch (e: any) { alert(e?.message ?? 'Could not save'); }
  }
  async function deleteCta(c: NewsletterCta) {
    if (!confirm(`Delete the "${c.name || 'Untitled'}" CTA?`)) return;
    try { await deleteNewsletterCta(c.id); loadCtas(); }
    catch (e: any) { alert(e?.message ?? 'Could not delete'); }
  }

  // ---- Stages ----
  async function saveStageName(s: Stage, name: string) {
    if (!name.trim() || name === s.name) return;
    await updateStage(s.id, { name: name.trim() }); load();
  }
  async function saveStageColor(s: Stage, color: string) { await updateStage(s.id, { color }); load(); }
  async function moveStage(idx: number, dir: -1 | 1) {
    const t = idx + dir; if (t < 0 || t >= stages.length) return;
    const a = stages[idx], b = stages[t];
    await Promise.all([updateStage(a.id, { sort_order: b.sort_order }), updateStage(b.id, { sort_order: a.sort_order })]);
    load();
  }
  async function archiveStageRow(s: Stage) {
    if (!confirm(`Archive "${s.name}"? New leads won't be able to land here.`)) return;
    await archiveStage(s.id); load();
  }
  async function addStage(e: React.FormEvent) {
    e.preventDefault(); if (!newStage.trim()) return;
    const next = stages.length ? Math.max(...stages.map((s) => s.sort_order)) + 10 : 10;
    await createStage(newStage.trim(), next); setNewStage(''); load();
  }

  // ---- Tiers ----
  async function saveTierName(t: Tier, name: string) {
    if (!name.trim() || name === t.name) return;
    await updateTier(t.id, { name: name.trim() }); loadTiers();
  }
  async function saveTierPrice(t: Tier, price: string) {
    const p = Number(price);
    if (isNaN(p) || p < 0 || p === t.price) return;
    await updateTier(t.id, { price: p }); loadTiers();
  }
  async function moveTier(idx: number, dir: -1 | 1) {
    const target = idx + dir; if (target < 0 || target >= tiers.length) return;
    const a = tiers[idx], b = tiers[target];
    await Promise.all([updateTier(a.id, { sort_order: b.sort_order }), updateTier(b.id, { sort_order: a.sort_order })]);
    loadTiers();
  }
  async function archiveTierRow(t: Tier) {
    if (!confirm(`Archive the "${t.name}" tier?`)) return;
    await archiveTier(t.id); loadTiers();
  }
  async function addTier(e: React.FormEvent) {
    e.preventDefault();
    if (!newTierName.trim()) return;
    const price = Number(newTierPrice);
    if (isNaN(price) || price < 0) { alert('Enter a valid price.'); return; }
    const next = tiers.length ? Math.max(...tiers.map((t) => t.sort_order)) + 10 : 10;
    await createTier(newTierName.trim(), price, next);
    setNewTierName(''); setNewTierPrice(''); loadTiers();
  }

  // ---- Duplicates ----
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
          <div className="crm-toolbar">
            <div className="seg">
              <button className={tab === 'tiers' ? 'active' : ''} onClick={() => setTab('tiers')}>Pricing tiers</button>
              <button className={tab === 'stages' ? 'active' : ''} onClick={() => setTab('stages')}>Pipeline stages</button>
              <button className={tab === 'cta' ? 'active' : ''} onClick={() => setTab('cta')}>Sign-up CTA</button>
              <button className={tab === 'duplicates' ? 'active' : ''} onClick={() => setTab('duplicates')}>
                Duplicates{dupes.length > 0 ? ` (${dupes.length})` : ''}
              </button>
            </div>
          </div>

          {/* ---- Pricing tiers ---- */}
          {tab === 'tiers' && (
          <div className="crm-card" style={{ padding: '8px 18px' }}>
            {tiers.length === 0 && (
              <p style={{ color: 'var(--crm-ink-soft)', padding: '12px 0 4px' }}>
                No tiers yet. Add your first below.
              </p>
            )}
            {tiers.map((t, i) => (
              <div key={t.id} className="crm-row" style={{ cursor: 'default' }}>
                <input className="crm-search" defaultValue={t.name} onBlur={(e) => saveTierName(t, e.target.value)}
                  placeholder="Tier name" style={{ flex: 1, maxWidth: 260 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'var(--crm-ink-soft)' }}>$</span>
                  <input className="crm-search" type="number" inputMode="decimal" defaultValue={t.price}
                    onBlur={(e) => saveTierPrice(t, e.target.value)} style={{ width: 110 }} />
                  <span style={{ color: 'var(--crm-ink-mute)', fontSize: '0.85rem' }}>/mo</span>
                </div>
                <div className="right" style={{ display: 'flex', gap: 6 }}>
                  <button className="action-btn" style={{ padding: '6px 10px' }} disabled={i === 0} onClick={() => moveTier(i, -1)}>↑</button>
                  <button className="action-btn" style={{ padding: '6px 10px' }} disabled={i === tiers.length - 1} onClick={() => moveTier(i, 1)}>↓</button>
                  <button className="action-btn" style={{ padding: '6px 10px' }} onClick={() => archiveTierRow(t)}>Archive</button>
                </div>
              </div>
            ))}
            <form onSubmit={addTier} style={{ display: 'flex', gap: 10, padding: '14px 0 6px', flexWrap: 'wrap' }}>
              <input className="crm-search" placeholder="New tier name…" value={newTierName} onChange={(e) => setNewTierName(e.target.value)} style={{ maxWidth: 260 }} />
              <input className="crm-search" type="number" inputMode="decimal" placeholder="Price" value={newTierPrice} onChange={(e) => setNewTierPrice(e.target.value)} style={{ width: 130, flex: '0 0 auto' }} />
              <button className="action-btn primary" type="submit">Add tier</button>
            </form>
          </div>
          )}

          {/* ---- Pipeline stages ---- */}
          {tab === 'stages' && (
          <div className="crm-card" style={{ padding: '8px 18px' }}>
            {stages.map((s, i) => (
              <div key={s.id} className="crm-row" style={{ cursor: 'default' }}>
                <input type="color" value={s.color} onChange={(e) => saveStageColor(s, e.target.value)}
                  style={{ width: 34, height: 34, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} />
                <input className="crm-search" defaultValue={s.name} onBlur={(e) => saveStageName(s, e.target.value)}
                  style={{ flex: 1, maxWidth: 320 }} />
                {s.is_default && <span className="lc-badge" style={{ background: 'var(--blue)' }}>Default</span>}
                {s.is_terminal && <span className="lc-badge" style={{ background: 'var(--crm-ink-mute)' }}>Terminal</span>}
                <div className="right" style={{ display: 'flex', gap: 6 }}>
                  <button className="action-btn" style={{ padding: '6px 10px' }} disabled={i === 0} onClick={() => moveStage(i, -1)}>↑</button>
                  <button className="action-btn" style={{ padding: '6px 10px' }} disabled={i === stages.length - 1} onClick={() => moveStage(i, 1)}>↓</button>
                  <button className="action-btn" style={{ padding: '6px 10px' }} onClick={() => archiveStageRow(s)}>Archive</button>
                </div>
              </div>
            ))}
            <form onSubmit={addStage} style={{ display: 'flex', gap: 10, padding: '14px 0 6px' }}>
              <input className="crm-search" placeholder="New stage name…" value={newStage} onChange={(e) => setNewStage(e.target.value)} style={{ maxWidth: 320 }} />
              <button className="action-btn primary" type="submit">Add stage</button>
            </form>
          </div>
          )}

          {/* ---- Newsletter sign-up CTAs ---- */}
          {tab === 'cta' && (
          <>
            {/* Info box: create a new CTA */}
            <div className="crm-card" style={{ padding: '18px 22px', maxWidth: 680 }}>
              <div className="crm-group-title" style={{ marginTop: 0 }}>New sign-up CTA</div>
              <p style={{ color: 'var(--crm-ink-soft)', margin: '0 0 6px' }}>
                Save reusable promo offers. Pick one to attach to a newsletter from the Subscriptions page.
              </p>
              <form onSubmit={addCta}>
                <div className="field">
                  <label>Package name</label>
                  <input className="crm-search" value={newCta.name} onChange={(e) => setNewCta({ ...newCta, name: e.target.value })} placeholder="e.g. Kickstart" />
                </div>
                <div className="field">
                  <label>Price (display text)</label>
                  <input className="crm-search" value={newCta.price_display} onChange={(e) => setNewCta({ ...newCta, price_display: e.target.value })} placeholder="e.g. $79.99 for two months" />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea rows={2} className="crm-search" value={newCta.description} onChange={(e) => setNewCta({ ...newCta, description: e.target.value })} placeholder="A short pitch for the offer." style={{ resize: 'vertical' }} />
                </div>
                <div className="field">
                  <label>Button label</label>
                  <input className="crm-search" value={newCta.button_label} onChange={(e) => setNewCta({ ...newCta, button_label: e.target.value })} placeholder="Sign up" />
                </div>
                <div className="field">
                  <label>Sign-up link (PT Distinction URL)</label>
                  <input className="crm-search" value={newCta.signup_url} onChange={(e) => setNewCta({ ...newCta, signup_url: e.target.value })} placeholder="https://…  (blank routes to the contact page)" />
                </div>
                <button className="action-btn primary" type="submit" disabled={addingCta} style={{ marginTop: 8 }}>
                  {addingCta ? 'Saving…' : 'Save CTA'}
                </button>
              </form>
            </div>

            {/* Saved CTAs, below the info box */}
            <div className="crm-group-title">Saved CTAs {ctas.length > 0 && <span className="count">{ctas.length}</span>}</div>
            {ctas.length === 0 ? (
              <div className="crm-card"><p style={{ color: 'var(--crm-ink-soft)', padding: '16px 18px', margin: 0 }}>No CTAs saved yet.</p></div>
            ) : (
              ctas.map((c) => (
                <div key={c.id} className="crm-card cta-card" style={{ padding: '16px 20px', maxWidth: 680 }}>
                  <div className="field" style={{ marginTop: 0 }}>
                    <label>Package name</label>
                    <input className="crm-search" defaultValue={c.name} onBlur={(e) => saveCtaField(c, 'name', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Price (display text)</label>
                    <input className="crm-search" defaultValue={c.price_display} onBlur={(e) => saveCtaField(c, 'price_display', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Description</label>
                    <textarea rows={2} className="crm-search" defaultValue={c.description} onBlur={(e) => saveCtaField(c, 'description', e.target.value)} style={{ resize: 'vertical' }} />
                  </div>
                  <div className="field">
                    <label>Button label</label>
                    <input className="crm-search" defaultValue={c.button_label} onBlur={(e) => saveCtaField(c, 'button_label', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Sign-up link</label>
                    <input className="crm-search" defaultValue={c.signup_url} onBlur={(e) => saveCtaField(c, 'signup_url', e.target.value)} placeholder="https://… (blank routes to the contact page)" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button className="action-btn" onClick={() => deleteCta(c)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </>
          )}

          {/* ---- Duplicates ---- */}
          {tab === 'duplicates' && (
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
          )}
        </>
      )}
    </CrmShell>
  );
}
