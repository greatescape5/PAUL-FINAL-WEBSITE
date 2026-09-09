'use client';

import { useRef, useState } from 'react';
import { sendNewsletter, uploadNewsletterImage } from '@/lib/crm';

// Lightweight WYSIWYG for the monthly newsletter. Uses execCommand (deprecated
// but universally supported) — plenty for a single-author internal tool. The
// server sanitizes + style-inlines the HTML before it goes out.
export default function NewsletterComposer({
  recipientCount, onSent,
}: {
  recipientCount: number;
  onSent: (sent: number) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }

  function addLink() {
    const url = prompt('Link URL (include https://)');
    if (!url) return;
    exec('createLink', url);
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
    if (!confirm(`Send "${subject.trim()}" to ${recipientCount} subscriber${recipientCount === 1 ? '' : 's'}?`)) return;
    setSending(true);
    setErr('');
    try {
      const { sent } = await sendNewsletter(subject.trim(), html);
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
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
        </div>
        <div ref={editorRef} className="nl-editor nl-content" contentEditable suppressContentEditableWarning />
        <p className="nl-hint">Wrapped in the Flow Motion template (logo, brand colors, unsubscribe link) when it sends.</p>
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
