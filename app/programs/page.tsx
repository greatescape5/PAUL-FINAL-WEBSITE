import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPrograms } from '@/lib/programs-server';
import ProgramsTabs from './ProgramsTabs';

// Re-read program edits from the DB without a redeploy.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Programs',
  description:
    'Choose your 1:1 online coaching program with Flow Motion Personal Training — self-guided training, full 1:1 coaching, and premium coaching, all built around your goals and your life.',
  alternates: { canonical: '/programs' },
  openGraph: {
    title: 'Programs | Flow Motion Personal Training',
    description:
      'Choose your 1:1 online coaching program — built around your goals and your life.',
    url: '/programs',
    type: 'website',
  },
};

export default async function ProgramsPage() {
  const programs = await getPublishedPrograms();

  return (
    <>
      <section className="hero">
        <div className="container center">
          <span className="eyebrow" style={{ color: 'var(--on-blue-dim)' }}>Coaching Programs</span>
          <h1>Find the program that fits your life</h1>
          <p className="lead" style={{ margin: '0 auto' }}>
            Every program is built around your goals, your schedule, and how much
            support you want. Pick your starting point — you can always move up.
          </p>
        </div>
      </section>

      <section className="section band-pale">
        <div className="container">
          <ProgramsTabs programs={programs} />
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
