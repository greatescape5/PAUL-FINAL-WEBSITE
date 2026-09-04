'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/crm';

type Status = 'idle' | 'signing' | 'error';

export default function AdminLoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');

  // Already signed in → straight to Today.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/admin/today');
      else setChecking(false);
    });
  }, [router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setStatus('signing');
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setStatus('error');
      setMsg(error.message);
    } else {
      router.replace('/admin/today');
    }
  }

  if (checking) {
    return <div className="crm-login"><div className="crm-login-card"><p style={{ margin: 0 }}>Loading…</p></div></div>;
  }

  return (
    <div className="crm-login">
      <div className="crm-login-card">
        <img src="/logo.png" alt="Flow Motion Personal Training" className="crm-login-logo" />
        <p>Sign in to the CRM.</p>
        <form onSubmit={signIn}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" disabled={status === 'signing'}>
            {status === 'signing' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {msg && <p className="crm-login-msg err">{msg}</p>}
        <p style={{ marginTop: 22, fontSize: '0.85rem' }}>
          <Link href="/" className="crm-back">← Back to site</Link>
        </p>
      </div>
    </div>
  );
}
