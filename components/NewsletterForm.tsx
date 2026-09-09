'use client';

import { useState } from 'react';

type Status = 'idle' | 'sending' | 'ok' | 'error';

// Reused by the footer and the popup. `source` records where they signed up.
export default function NewsletterForm({
  source,
  compact = false,
  onSuccess,
}: {
  source: string;
  compact?: boolean;
  onSuccess?: () => void;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');

    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    params.forEach((v, k) => { if (k.startsWith('utm_')) utm[k] = v; });

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
          company,
          utm,
          referrer: document.referrer || null,
          landing_page: window.location.pathname,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('ok');
      setEmail('');
      onSuccess?.();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <p className="newsletter-ok" role="status">
        You&rsquo;re on the list — thanks for subscribing!
      </p>
    );
  }

  return (
    <form className={`newsletter-form${compact ? ' compact' : ''}`} onSubmit={handleSubmit}>
      {/* Honeypot — hidden from people; bots fill it and get silently dropped */}
      <input
        type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true"
        value={company} onChange={(e) => setCompany(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />
      <div className="newsletter-row">
        <input
          type="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
          {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && (
        <p className="newsletter-err">Something went wrong — please try again.</p>
      )}
    </form>
  );
}
