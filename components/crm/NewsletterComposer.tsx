'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { sendNewsletter, uploadNewsletterImage, getNewsletterCtas, type NewsletterCta } from '@/lib/crm';

// Lightweight WYSIWYG for the monthly newsletter. Uses execCommand (deprecated
// but universally supported) — plenty for a single-author internal tool. The
// server sanitizes + style-inlines the HTML before it goes out.
export default function NewsletterComposer({
  totalActive, groups, groupCounts, initialGroup = 'all', onSent,
}: {
  totalActive: number;
  groups: string[];
  groupCounts: Record<string, number>;
  initialGroup?: string;
  onSent: (sent: number) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [ctas, setCtas] = useState<NewsletterCta[]>([]);
  const [selectedCtaId, setSelectedCtaId] = useState<string | null>(null);
  // Empty set = "all subscribers"; otherwise the union of the chosen groups.
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    () => new Set(initialGroup && initialGroup !== 'all' ? [initialGroup] : []),
  );

  useEffect(() => {
    getNewsletterCtas().then(setCtas).catch(() => {});
  }, []);

  const selectedCta = ctas.find((c) => c.id === selectedCtaId) ?? null;
  const allMode = selectedGroups.size === 0;
  const recipientCount = allMode
    ? totalActive
    : [...selectedGroups].reduce((n, g) => n + (groupCounts[g] ?? 0), 0);

  function toggleGroup(g: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  }

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }

  function addLink() {
    const url = prompt('Link URL (include https://)');
    if (!url) return;
    exec('createLink', url);
  }

  // Email can't play video inline, so a "video" is a clickable thumbnail (for
  // YouTube) or a Watch button that opens the link.
  function insertVideo() {
    const raw = prompt('Paste a video link (YouTube, Vimeo, or any URL). It becomes a clickable button/thumbnail — email can’t play video inline.');
    const url = raw?.trim();
    if (!url) return;
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    const html = yt
      ? `<a href="${url}" target="_blank" rel="noopener" style="text-decoration:none;color:#456a92;">`
        + `<img src="https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg" alt="Watch the video" style="max-width:100%;border-radius:8px;display:block;margin:10px 0 6px;" />`
        + `<span style="font-weight:700;">▶ Watch the video</span></a>`
      : `<a href="${url}" target="_blank" rel="noopener" style="display:inline-block;background:#b51f21;color:#ffffff;padding:12px 22px;border-radius:8px;font-weight:700;text-decoration:none;margin:10px 0;">▶ Watch the video</a>`;
    exec('insertHTML', html + '<p><br></p>');
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setErr('');
    try {
      const url = await uploadNewsletterImage(file);
      exec('insertHTML', `<img src="${url}" alt="" />`);
    } catch (e: any) {
      setErr(e?.message ?? 'Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    const html = editorRef.current?.innerHTML.trim() || '';
    if (!subject.trim() || !html || html === '<br>') {
      setErr('Add a subject and some content first.');
      return;
    }
    const target = allMode
      ? 'all subscribers'
      : `${selectedGroups.size} group${selectedGroups.size === 1 ? '' : 's'}`;
    if (!confirm(`Send "${subject.trim()}" to ${recipientCount} subscriber${recipientCount === 1 ? '' : 's'} in ${target}?`)) return;
    setSending(true);
    setErr('');
    try {
      const { sent } = await sendNewsletter(subject.trim(), html, selectedCtaId, allMode ? null : [...selectedGroups]);
      setSubject('');
      if (editorRef.current) editorRef.current.innerHTML = '';
      onSent(sent);
    } catch (e: any) {
      setErr(e?.message ?? 'Send failed');
    } finally {
      setSending(false);
    }
  }

  const btn = (label: string, onClick: () => void, title?: string) => (
    <button type="button" className="nl-tool" title={title || label}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}>{label}</button>
  );

  return (
    <div className="nl-composer">
      <div className="field">
        <label>Send to {allMode ? '' : `— ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`}</label>
        <div className="nl-group-picker">
          <label className={`nl-group-opt${allMode ? ' on' : ''}`}>
            <input type="checkbox" checked={allMode} onChange={() => setSelectedGroups(new Set())} />
            All subscribers ({totalActive})
          </label>
          {groups.map((g) => (
            <label key={g} className={`nl-group-opt${selectedGroups.has(g) ? ' on' : ''}`}>
              <input type="checkbox" checked={selectedGroups.has(g)} onChange={() => toggleGroup(g)} />
              {g} ({groupCounts[g] ?? 0})
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. March check-in: spring reset" />
      </div>

      <div className="field">
        <label>Message</label>
        <div className="nl-toolbar">
          {btn('B', () => exec('bold'), 'Bold')}
          {btn('i', () => exec('italic'), 'Italic')}
          {btn('H', () => exec('formatBlock', 'H2'), 'Heading')}
          {btn('H₃', () => exec('formatBlock', 'H3'), 'Subheading')}
          {btn('¶', () => exec('formatBlock', 'P'), 'Normal text')}
          {btn('• List', () => exec('insertUnorderedList'), 'Bullet list')}
          {btn('Link', addLink, 'Insert link')}
          <button type="button" className="nl-tool" title="Insert image"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Image'}
          </button>
          {btn('Video', insertVideo, 'Insert a video link (clickable thumbnail/button)')}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
        </div>
        <div ref={editorRef} className="nl-editor nl-content" contentEditable suppressContentEditableWarning />
        <p className="nl-hint">Wrapped in the Flow Motion template (logo, brand colors, unsubscribe link) when it sends. Video inserts a clickable thumbnail/button (email can’t play video inline).</p>
      </div>

      <div className="nl-cta-toggle">
        {ctas.length > 0 ? (
          <>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Add a sign-up CTA to the bottom</div>
            <div className="nl-cta-list">
              {ctas.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`nl-cta-chip${selectedCtaId === c.id ? ' on' : ''}`}
                  onClick={() => setSelectedCtaId(selectedCtaId === c.id ? null : c.id)}
                >
                  <span className="nm">{c.name || 'Untitled offer'}</span>
                  {c.price_display && <span className="pr">{c.price_display}</span>}
                </button>
              ))}
            </div>
            {selectedCta && (
              <div className="nl-cta-preview">
                <div className="nl-cta-eyebrow">Special offer</div>
                {selectedCta.name && <div className="nl-cta-name">{selectedCta.name}</div>}
                {selectedCta.price_display && <div className="nl-cta-price">{selectedCta.price_display}</div>}
                {selectedCta.description && <div className="nl-cta-desc">{selectedCta.description}</div>}
                <span className="nl-cta-btn">{selectedCta.button_label || 'Sign up'}</span>
              </div>
            )}
          </>
        ) : (
          <p className="nl-hint" style={{ margin: 0 }}>
            No sign-up CTAs yet. Create one in <Link href="/admin/settings">Settings → Sign-up CTA</Link> to offer it here.
          </p>
        )}
      </div>

      {err && <p className="nl-composer-err">{err}</p>}

      <div className="sheet-actions" style={{ justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--crm-ink-soft)', fontSize: '0.9rem' }}>
          Sends to {recipientCount} subscribed
        </span>
        <button className="action-btn primary" onClick={send} disabled={sending || recipientCount === 0}>
          {sending ? 'Sending…' : 'Send newsletter'}
        </button>
      </div>
    </div>
  );
}
