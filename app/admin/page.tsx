'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/crm';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function AdminLoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');

  // Already signed in → straight to Today.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/admin/today');
      else setChecking(false);
    });
  }, [router]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setMsg('');
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/admin/today` : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    if (error) {
      setStatus('error');
      setMsg(error.message);
    } else {
      setStatus('sent');
      setMsg('Check your email for a sign-in link.');
    }
  }

  if (checking) {
    return <div className="crm-login"><div className="crm-login-card"><p style={{ margin: 0 }}>Loading…</p></div></div>;
  }

  return (
    <div className="crm-login">
      <div className="crm-login-card">
        <h1>Flow Motion CRM</h1>
        <p>Sign in with your email — we&rsquo;ll send you a one-tap link.</p>
        <form onSubmit={sendLink}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <button type="submit" disabled={status === 'sending' || status === 'sent'}>
            {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Link sent' : 'Send sign-in link'}
          </button>
        </form>
        {msg && <p className={`crm-login-msg ${status === 'error' ? 'err' : 'ok'}`}>{msg}</p>}
        <p style={{ marginTop: 22, fontSize: '0.85rem' }}>
          <Link href="/" className="crm-back">← Back to site</Link>
        </p>
      </div>
    </div>
  );
}
