'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase, getMrr } from '@/lib/crm';

const NAV = [
  { href: '/admin/today', label: 'Today' },
  { href: '/admin/people', label: 'People' },
  { href: '/admin/settings', label: 'Settings' },
];

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function CrmShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [who, setWho] = useState('');
  const [mrr, setMrr] = useState<{ mrr: number; active_clients: number; paused_clients: number } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/admin'); return; }
      if (!active) return;
      setWho(data.session.user.email ?? '');
      setReady(true);
      try { setMrr(await getMrr()); } catch { /* view empty until data lands */ }
    });
    // Sign-out elsewhere → bounce to login.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace('/admin');
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/admin');
  }

  if (!ready) {
    return <div className="crm-login"><div className="crm-login-card"><p style={{ margin: 0 }}>Loading…</p></div></div>;
  }

  return (
    <div className="crm-app">
      <aside className="crm-sidebar">
        <div className="crm-brand">Flow Motion<small>CRM</small></div>
        <div className="crm-mrr">
          <div className="val">{mrr ? money(mrr.mrr) : '—'}</div>
          <div className="lbl">Monthly recurring</div>
          {mrr && (
            <div className="sub">
              {mrr.active_clients} active
              {mrr.paused_clients > 0 && ` · ${mrr.paused_clients} paused`}
            </div>
          )}
        </div>
        <nav className="crm-nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={pathname === n.href ? 'active' : ''}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="crm-side-foot">
          {who && <div className="who" title={who}>{who}</div>}
          <button className="crm-signout" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className="crm-main">
        <div className="crm-topbar">
          <h1>{title}</h1>
        </div>
        <div className="crm-content">{children}</div>
      </main>
    </div>
  );
}
