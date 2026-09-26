import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPrograms } from '@/lib/programs-server';
import ProgramGrid from '@/components/ProgramGrid';

// Re-read program edits from the DB without a redeploy.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Coaching',
  description:
    'Ongoing online coaching from Flow Motion Personal Training — monthly plans with training, accountability, and full 1:1 support. Build, Accountability, and 1:1 Coaching.',
  alternates: { canonical: '/coaching' },
  openGraph: {
    title: 'Coaching | Flow Motion Personal Training',
    description: 'Ongoing monthly coaching — training, accountability, and full 1:1 support.',
    url: '/coaching',
    type: 'website',
  },
};

export default async function CoachingPage() {
  const programs = (await getPublishedPrograms()).filter((p) => !p.oneOff);

  return (
    <>
      <section className="hero">
        <div className="container center">
          <span className="eyebrow" style={{ color: 'var(--on-blue-dim)' }}>Ongoing Coaching</span>
          <h1>Coaching that grows with you</h1>
          <p className="lead" style={{ margin: '0 auto' }}>
            Monthly coaching built around your life — from smart programming and
            accountability to full 1:1 support. Start where you are and move up
            as you go. Prefer a one-time plan?{' '}
            <Link href="/programs">See the programs</Link>.
          </p>
        </div>
      </section>

      <section className="section band-pale">
        <div className="container">
          <ProgramGrid programs={programs} emptyNote="Coaching plans are coming soon — check back shortly." />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <span className="eyebrow" style={{ color: 'var(--blue-mist)' }}>Not Sure Which One?</span>
            <h2>Let&rsquo;s figure it out together</h2>
            <p>
              Tell me your goals and where you&rsquo;re starting from, and I&rsquo;ll
              point you to the right fit — no pressure.
            </p>
            <div className="btn-row center">
              <Link href="/contact#get-in-touch" className="btn btn-primary">Start The Conversation</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
