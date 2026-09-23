'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getProgramsAdmin, createProgram, updateProgram, deleteProgram,
  type ProgramRow,
} from '@/lib/crm';

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'program';
}

export default function ProgramsAdmin() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setPrograms(await getProgramsAdmin()); }
    catch { setPrograms([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function patch(idx: number, key: keyof ProgramRow, value: unknown) {
    setPrograms((prev) => prev.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
    setSavedId(null);
  }
  function setFeature(idx: number, fi: number, value: string) {
    setPrograms((prev) => prev.map((p, i) => (i === idx ? { ...p, features: p.features.map((f, j) => (j === fi ? value : f)) } : p)));
  }
  function addFeature(idx: number) {
    setPrograms((prev) => prev.map((p, i) => (i === idx ? { ...p, features: [...p.features, ''] } : p)));
  }
  function removeFeature(idx: number, fi: number) {
    setPrograms((prev) => prev.map((p, i) => (i === idx ? { ...p, features: p.features.filter((_, j) => j !== fi) } : p)));
  }

  async function save(p: ProgramRow) {
    const slug = slugify(p.slug || p.name);
    setSavingId(p.id);
    try {
      await updateProgram(p.id, {
        slug,
        name: p.name.trim(),
        tagline: p.tagline.trim(),
        description: p.description.trim(),
        price_display: p.price_display.trim(),
        price_note: p.price_note.trim(),
        term_options: p.term_options.trim(),
        features: p.features.map((f) => f.trim()).filter(Boolean),
        cover_image: p.cover_image.trim(),
        cta_label: p.cta_label.trim(),
        ptd_url: p.ptd_url.trim(),
        one_off: p.one_off,
        ptd_url_home: p.ptd_url_home.trim(),
        ptd_url_gym: p.ptd_url_gym.trim(),
        featured: p.featured,
        published: p.published,
      });
      setSavedId(p.id);
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Could not save (slug may already be in use)');
    } finally { setSavingId(null); }
  }

  async function addProgram() {
    setAdding(true);
    try {
      const next = programs.length ? Math.max(...programs.map((p) => p.sort_order)) + 10 : 10;
      const id = await createProgram({
        slug: `new-program-${Math.random().toString(36).slice(2, 7)}`,
        name: 'New program', tagline: '', description: '', price_display: '',
        term_options: '', features: [], published: false, sort_order: next,
      });
      await load();
      setEditingId(id); // jump straight into the new program's editor
    } catch (e: any) { alert(e?.message ?? 'Could not add'); }
    finally { setAdding(false); }
  }

  async function remove(p: ProgramRow) {
    if (!confirm(`Delete the "${p.name || 'Untitled'}" program? This removes it from the website.`)) return;
    try { await deleteProgram(p.id); setEditingId(null); await load(); }
    catch (e: any) { alert(e?.message ?? 'Could not delete'); }
  }

  async function move(idx: number, dir: -1 | 1) {
    const t = idx + dir;
    if (t < 0 || t >= programs.length) return;
    const a = programs[idx], b = programs[t];
    try {
      await Promise.all([
        updateProgram(a.id, { sort_order: b.sort_order }),
        updateProgram(b.id, { sort_order: a.sort_order }),
      ]);
      await load();
    } catch (e: any) { alert(e?.message ?? 'Could not reorder'); }
  }

  if (loading) return <div className="crm-loading">Loading…</div>;

  const editIdx = programs.findIndex((p) => p.id === editingId);

  // ---- Grid of tiles ----
  if (editIdx < 0) {
    return (
      <>
        <div className="crm-toolbar" style={{ marginBottom: 14 }}>
          <p style={{ color: 'var(--crm-ink-soft)', margin: 0, flex: 1 }}>
            These are the packages shown on the public <strong>/programs</strong> page. Click one to edit — changes go live within a minute.
          </p>
          <button className="action-btn primary" onClick={addProgram} disabled={adding}>
            {adding ? 'Adding…' : '+ Add program'}
          </button>
        </div>

        {programs.length === 0 ? (
          <div className="crm-card"><p style={{ color: 'var(--crm-ink-soft)', padding: '16px 18px', margin: 0 }}>No programs yet. Add your first above.</p></div>
        ) : (
          <div className="pe-tiles">
            {programs.map((p) => (
              <button key={p.id} className="pe-tile" onClick={() => setEditingId(p.id)}>
                <div className="pe-tile-badges">
                  {!p.published && <span className="pe-badge off">Draft</span>}
                  {p.featured && <span className="pe-badge feat">Featured</span>}
                </div>
                <div className="pe-tile-name">{p.name || 'Untitled program'}</div>
                {p.tagline && <div className="pe-tile-tag">{p.tagline}</div>}
                <div className="pe-tile-meta">
                  {p.price_display || 'No price'}{p.term_options ? ` · ${p.term_options}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  // ---- Single program editor ----
  const p = programs[editIdx];
  const idx = editIdx;
  return (
    <>
      <div className="crm-toolbar" style={{ marginBottom: 14 }}>
        <button className="crm-back" onClick={() => setEditingId(null)} style={{ cursor: 'pointer', background: 'none', border: 'none' }}>← All programs</button>
        <div style={{ flex: 1 }} />
        <button className="action-btn" style={{ padding: '6px 10px' }} disabled={idx === 0} onClick={() => move(idx, -1)}>↑ Move up</button>
        <button className="action-btn" style={{ padding: '6px 10px' }} disabled={idx === programs.length - 1} onClick={() => move(idx, 1)}>↓ Move down</button>
      </div>

      <div className="crm-card program-editor" style={{ padding: '18px 22px', maxWidth: 760 }}>
        <div className="program-editor-head">
          <label className="pe-toggle"><input type="checkbox" checked={p.published} onChange={(e) => patch(idx, 'published', e.target.checked)} /> Published</label>
          <label className="pe-toggle"><input type="checkbox" checked={p.featured} onChange={(e) => patch(idx, 'featured', e.target.checked)} /> Featured (&ldquo;Most Popular&rdquo;)</label>
        </div>

          <div className="pe-grid">
            <div className="field"><label>Package name</label>
              <input className="crm-search" value={p.name} onChange={(e) => patch(idx, 'name', e.target.value)} placeholder="e.g. Self-Guided Training" /></div>
            <div className="field"><label>URL slug</label>
              <input className="crm-search" value={p.slug} onChange={(e) => patch(idx, 'slug', e.target.value)} placeholder="self-guided" /></div>
          </div>

          <div className="field"><label>Short description (under the name)</label>
            <input className="crm-search" value={p.tagline} onChange={(e) => patch(idx, 'tagline', e.target.value)} placeholder="e.g. Your custom plan, on your schedule." /></div>

          <div className="pe-grid">
            <div className="field"><label>Price (display text)</label>
              <input className="crm-search" value={p.price_display} onChange={(e) => patch(idx, 'price_display', e.target.value)} placeholder="e.g. $99/mo" /></div>
            <div className="field"><label>Length / terms</label>
              <input className="crm-search" value={p.term_options} onChange={(e) => patch(idx, 'term_options', e.target.value)} placeholder="e.g. Monthly · 3 or 6 month" /></div>
          </div>
          <div className="field"><label>Small print under price (optional)</label>
            <input className="crm-search" value={p.price_note} onChange={(e) => patch(idx, 'price_note', e.target.value)} placeholder="e.g. billed monthly" /></div>

          <div className="field"><label>Bullet points (what&rsquo;s included)</label>
            {p.features.map((f, fi) => (
              <div key={fi} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input className="crm-search" value={f} onChange={(e) => setFeature(idx, fi, e.target.value)} placeholder="Bullet point" style={{ flex: 1 }} />
                <button className="action-btn" style={{ padding: '6px 10px' }} title="Remove" onClick={() => removeFeature(idx, fi)}>×</button>
              </div>
            ))}
            <button className="action-btn" style={{ marginTop: 4 }} onClick={() => addFeature(idx)}>+ Add bullet</button>
          </div>

          <div className="field"><label>&ldquo;What this is&rdquo; (long description on the package page)</label>
            <textarea rows={4} className="crm-search" value={p.description} onChange={(e) => patch(idx, 'description', e.target.value)} placeholder="A paragraph describing the package, shown when a client clicks in." style={{ resize: 'vertical' }} /></div>

          <div className="field"><label>PT Distinction sign-up link</label>
            <input className="crm-search" value={p.ptd_url} onChange={(e) => patch(idx, 'ptd_url', e.target.value)} placeholder="https://…  (blank routes to the contact page)" /></div>

          <div className="pe-grid">
            <div className="field"><label>Button label (optional)</label>
              <input className="crm-search" value={p.cta_label} onChange={(e) => patch(idx, 'cta_label', e.target.value)} placeholder="Defaults to “Get Started with …”" /></div>
            <div className="field"><label>Cover image path (optional)</label>
              <input className="crm-search" value={p.cover_image} onChange={(e) => patch(idx, 'cover_image', e.target.value)} placeholder="/photos/coaching.png" /></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <button className="action-btn primary" onClick={() => save(p)} disabled={savingId === p.id}>
              {savingId === p.id ? 'Saving…' : 'Save program'}
            </button>
            {savedId === p.id && <span style={{ color: '#10b981', fontSize: '0.9rem' }}>Saved ✓</span>}
            <div style={{ flex: 1 }} />
            <button className="action-btn" onClick={() => remove(p)}>Delete</button>
          </div>
      </div>
    </>
  );
}
