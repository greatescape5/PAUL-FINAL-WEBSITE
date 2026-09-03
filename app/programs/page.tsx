import type { Metadata } from 'next';
import Link from 'next/link';
import { getPrograms } from '@/lib/programs';

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

export default function ProgramsPage() {
  const programs = getPrograms();

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
          {programs.length === 0 ? (
            <div className="empty-note">Programs are coming soon — check back shortly.</div>
          ) : (
            <div className="program-grid">
              {programs.map((p) => (
                <div key={p.slug} className={`program-card${p.featured ? ' featured' : ''}`}>
                  {p.featured && <span className="program-flag">Most Popular</span>}
                  <div
                    className="program-cover"
                    style={{ ['--cover' as string]: `url('${p.coverImage}')` }}
                    role="img"
                    aria-label={p.name}
                  />
                  <div className="program-body">
                    <h3>{p.name}</h3>
                    <p className="program-tagline">{p.tagline}</p>
                    <div className="program-price">
                      <span className="amount">{p.priceDisplay}</span>
                    </div>
                    <p className="program-terms">{p.termOptions}</p>
                    <ul className="feature-list">
                      {p.features.map((f, i) => (
                        <li key={i} className={f.trim().endsWith('plus:') ? 'feature-lead' : ''}>{f}</li>
                      ))}
                    </ul>
                    <div className="program-actions">
                      <Link href={`/programs/${p.slug}`} className="btn btn-primary">View Program</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
