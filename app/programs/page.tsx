import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPrograms } from '@/lib/programs-server';
import ProgramGrid from '@/components/ProgramGrid';

// Re-read program edits from the DB without a redeploy.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Programs',
  description:
    'One-time training programs from Flow Motion Personal Training — buy once, follow a structured plan, gym or at home. Starter, Kickstart, and Transformation.',
  alternates: { canonical: '/programs' },
  openGraph: {
    title: 'Programs | Flow Motion Personal Training',
    description: 'One-time training programs — buy once, train gym or at home.',
    url: '/programs',
    type: 'website',
  },
};

export default async function ProgramsPage() {
  const programs = (await getPublishedPrograms()).filter((p) => p.oneOff);

  return (
    <>
      <section className="hero">
        <div className="container center">
          <span className="eyebrow" style={{ color: 'var(--on-blue-dim)' }}>One-Time Programs</span>
          <h1>Invest once. Train on your own schedule.</h1>
          <p className="lead" style={{ margin: '0 auto' }}>
            Structured, done-for-you programs you purchase once — pick the gym or
            at-home version and go at your own pace. Ready to flow together?
          </p>
          <div className="btn-row center" style={{ marginTop: 22 }}>
            <a href="#packages" className="btn btn-outline">See the Programs</a>
          </div>
        </div>
      </section>

      <section id="packages" className="section band-pale anchor-offset">
        <div className="container">
          <ProgramGrid programs={programs} emptyNote="Programs are coming soon — check back shortly." />
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
