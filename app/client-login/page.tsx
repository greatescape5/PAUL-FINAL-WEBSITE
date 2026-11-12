import type { Metadata } from 'next';
import ClientPortal from '@/components/ClientPortal';

export const metadata: Metadata = {
  title: 'Client Login',
  description: 'Sign in to your Flow Motion Personal Training client portal.',
  alternates: { canonical: '/client-login' },
  // Utility page — no need for search engines to index the portal.
  robots: { index: false, follow: false },
};

export default function ClientLoginPage() {
  return (
    <>
      <section className="hero">
        <div className="container center">
          <span className="eyebrow" style={{ color: 'var(--on-blue-dim)' }}>Members</span>
          <h1>Client Login</h1>
          <p className="lead" style={{ margin: '0 auto' }}>
            Sign in to access your training, check-ins, and messages.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <ClientPortal />
        </div>
      </section>
    </>
  );
}
