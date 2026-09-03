import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProgram, getPrograms } from '@/lib/programs';
import { BUSINESS } from '@/lib/site';

// Pre-render every published program at build time.
export function generateStaticParams() {
  return getPrograms().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const program = getProgram(params.slug);
  if (!program) return { title: 'Program Not Found' };
  const desc = `${program.tagline} ${program.description}`.slice(0, 160);
  return {
    title: program.name,
    description: desc,
    alternates: { canonical: `/programs/${program.slug}` },
    openGraph: {
      title: `${program.name} | ${BUSINESS.name}`,
      description: desc,
      url: `/programs/${program.slug}`,
      type: 'website',
      images: [program.coverImage],
    },
  };
}

export default function ProgramDetailPage({ params }: { params: { slug: string } }) {
  const program = getProgram(params.slug);
  if (!program) notFound();

  // Purchase action. When PT Distinction is wired up (Phase 4), `ptdUrl` holds
  // the package signup/embed link; until then the action routes to the contact
  // form so no lead is lost.
  const actionHref = program.ptdUrl || '/contact#get-in-touch';
  const actionLabel = program.ctaLabel || `Get Started with ${program.name}`;

  return (
    <>
      <section className="hero" style={{ padding: '56px 0 44px' }}>
        <div className="container">
          <p style={{ marginBottom: 14 }}>
            <Link href="/programs" style={{ color: 'var(--on-blue-dim)' }}>&larr; All Programs</Link>
          </p>
          <span className="eyebrow" style={{ color: 'var(--on-blue-dim)' }}>Coaching Program</span>
          <h1>{program.name}</h1>
          <p className="lead">{program.tagline}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="program-detail">
            {/* Left: what it is + what's included */}
            <div>
              <div
                className="program-detail-cover"
                style={{ ['--cover' as string]: `url('${program.coverImage}')` }}
                role="img"
                aria-label={program.name}
              />
              <h2 style={{ marginTop: 28 }}>What this is</h2>
              <p>{program.description}</p>

              <h2 style={{ marginTop: 28 }}>What&rsquo;s included</h2>
              <ul className="feature-list detail">
                {program.features.map((f, i) => (
                  <li key={i} className={f.trim().endsWith('plus:') ? 'feature-lead' : ''}>{f}</li>
                ))}
              </ul>
            </div>

            {/* Right: pricing + purchase action, together in one view */}
            <aside className="program-buy">
              <div className="program-buy-card">
                <div className="program-price">
                  <span className="amount">{program.priceDisplay}</span>
                </div>
                <p className="program-terms">{program.termOptions}</p>
                {program.priceNote && <p className="form-note" style={{ marginTop: 4 }}>{program.priceNote}</p>}

                <a href={actionHref} className="btn btn-primary" style={{ width: '100%', textAlign: 'center', marginTop: 18 }}>
                  {actionLabel}
                </a>

                <p className="form-note" style={{ marginTop: 14 }}>
                  Onboarding and your program are handled in the PT Distinction app.
                  Have a question first? <Link href="/contact#get-in-touch">Reach out</Link>.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section band-pale">
        <div className="container center">
          <span className="eyebrow">Still Deciding?</span>
          <h2>Let&rsquo;s talk it through</h2>
          <p className="lead" style={{ margin: '0 auto 22px' }}>
            Not sure this is the right fit? Send a message and I&rsquo;ll help you choose.
          </p>
          <div className="btn-row center">
            <Link href="/contact#get-in-touch" className="btn btn-primary">Start The Conversation</Link>
            <Link href="/programs" className="btn btn-outline">Compare Programs</Link>
          </div>
        </div>
      </section>
    </>
  );
}
