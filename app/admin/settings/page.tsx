'use client';

import { useCallback, useEffect, useState } from 'react';
import CrmShell from '@/components/crm/CrmShell';
import {
  getStages, createStage, updateStage, archiveStage,
  getTiers, createTier, updateTier, archiveTier,
  getPossibleDuplicates, mergeContacts,
  getNewsletterOffer, saveNewsletterOffer,
  type Stage, type Tier, type PossibleDuplicate, type NewsletterOffer,
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
  const [offer, setOffer] = useState<NewsletterOffer | null>(null);
  const [savingOffer, setSavingOffer] = useState(false);
  const [offerSaved, setOfferSaved] = useState(false);

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

  const loadOffer = useCallback(async () => {
    try { setOffer(await getNewsletterOffer()); } catch { setOffer(null); }
  }, []);

  useEffect(() => { load(); loadTiers(); loadOffer(); }, [load, loadTiers, loadOffer]);

  // ---- Newsletter CTA offer ----
  function setOfferField<K extends keyof NewsletterOffer>(key: K, value: NewsletterOffer[K]) {
    setOffer((o) => (o ? { ...o, [key]: value } : o));
    setOfferSaved(false);
  }
  async function saveOffer() {
    if (!offer) return;
    setSavingOffer(true);
    try {
      await saveNewsletterOffer({
        enabled: offer.enabled,
        name: offer.name.trim(),
        price_display: offer.price_display.trim(),
        description: offer.description.trim(),
        button_label: offer.button_label.trim() || 'Sign up',
        signup_url: offer.signup_url.trim(),
      });
      setOfferSaved(true);
    } catch (e: any) { alert(e?.message ?? 'Could not save'); }
    finally { setSavingOffer(false); }
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

          {/* ---- Newsletter sign-up CTA ---- */}
          {tab === 'cta' && (
          <div className="crm-card" style={{ padding: '18px 22px', maxWidth: 640 }}>
            {!offer ? (
              <p style={{ color: 'var(--crm-ink-soft)', margin: 0 }}>
                The CTA offer isn&rsquo;t set up yet. Run migration 0012, then reload.
              </p>
            ) : (
              <>
                <p style={{ color: 'var(--crm-ink-soft)', marginTop: 0 }}>
                  Configure the promotional offer the client can drop into a newsletter. When enabled,
                  a &ldquo;Add the sign-up CTA&rdquo; box appears in the composer.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 16px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={offer.enabled} onChange={(e) => setOfferField('enabled', e.target.checked)} />
                  <span>Offer this CTA (make it available in the composer)</span>
                </label>

                <div className="field">
                  <label>Package name</label>
                  <input className="crm-search" value={offer.name} onChange={(e) => setOfferField('name', e.target.value)} placeholder="e.g. Kickstart" />
                </div>
                <div className="field">
                  <label>Price (display text)</label>
                  <input className="crm-search" value={offer.price_display} onChange={(e) => setOfferField('price_display', e.target.value)} placeholder="e.g. $79.99 for two months" />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea rows={3} className="crm-search" value={offer.description} onChange={(e) => setOfferField('description', e.target.value)} placeholder="A short pitch for the offer." style={{ resize: 'vertical' }} />
                </div>
                <div className="field">
                  <label>Button label</label>
                  <input className="crm-search" value={offer.button_label} onChange={(e) => setOfferField('button_label', e.target.value)} placeholder="Sign up" />
                </div>
                <div className="field">
                  <label>Sign-up link (PT Distinction URL)</label>
                  <input className="crm-search" value={offer.signup_url} onChange={(e) => setOfferField('signup_url', e.target.value)} placeholder="https://…  (blank routes to the contact page)" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <button className="action-btn primary" onClick={saveOffer} disabled={savingOffer}>
                    {savingOffer ? 'Saving…' : 'Save CTA'}
                  </button>
                  {offerSaved && <span style={{ color: '#10b981', fontSize: '0.9rem' }}>Saved ✓</span>}
                </div>
              </>
            )}
          </div>
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
