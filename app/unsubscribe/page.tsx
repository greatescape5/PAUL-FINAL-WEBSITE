'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type State = 'loading' | 'ready' | 'done' | 'invalid';

function UnsubscribeInner() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState<State>('loading');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setEmail(d.email || '');
        setState(d.status === 'unsubscribed' ? 'done' : 'ready');
      })
      .catch(() => setState('invalid'));
  }, [token]);

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error();
      setState('done');
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520, padding: '80px 20px', textAlign: 'center' }}>
      {state === 'loading' && <p>Loading…</p>}

      {state === 'invalid' && (
        <>
          <h1>Link not valid</h1>
          <p>This unsubscribe link is missing or has expired. If you keep getting emails, reply to one and we&rsquo;ll remove you.</p>
          <p><Link href="/">Back to the website</Link></p>
        </>
      )}

      {state === 'ready' && (
        <>
          <h1>Unsubscribe</h1>
          <p>You&rsquo;re about to unsubscribe <strong>{email}</strong> from the Flow Motion newsletter.</p>
          <button className="btn btn-primary" onClick={confirm} disabled={busy} style={{ marginTop: 12 }}>
            {busy ? 'Unsubscribing…' : 'Confirm unsubscribe'}
          </button>
          <p style={{ marginTop: 18 }}><Link href="/">Never mind — keep me subscribed</Link></p>
        </>
      )}

      {state === 'done' && (
        <>
          <h1>You&rsquo;re unsubscribed</h1>
          <p>{email ? <><strong>{email}</strong> has been removed</> : 'You have been removed'} from the Flow Motion newsletter. Sorry to see you go!</p>
          <p><Link href="/">Back to the website</Link></p>
        </>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}><p>Loading…</p></div>}>
      <UnsubscribeInner />
    </Suspense>
  );
}
