import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedProgram, getPublishedPrograms } from '@/lib/programs-server';
import { BUSINESS } from '@/lib/site';

// Re-read program edits from the DB without a redeploy; render new slugs on demand.
export const revalidate = 60;
export const dynamicParams = true;

// Pre-render every published program.
export async function generateStaticParams() {
  const programs = await getPublishedPrograms();
  return programs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const program = await getPublishedProgram(params.slug);
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

export default async function ProgramDetailPage({ params }: { params: { slug: string } }) {
  const program = await getPublishedProgram(params.slug);
  if (!program) notFound();

  // Purchase action. `ptdUrl` holds the PT Distinction signup link; until it's
  // set, the action routes to the contact form so no lead is lost.
  const actionHref = program.ptdUrl || '/contact#get-in-touch';
  const actionLabel = program.ctaLabel || `Get Started with ${program.name}`;
  // Recurring plans live under Coaching; one-time ones under Programs.
  const listHref = program.oneOff ? '/programs' : '/coaching';
  const listLabel = program.oneOff ? 'All Programs' : 'All Coaching';

  return (
    <>
      <section className="hero" style={{ padding: '56px 0 44px' }}>
        <div className="container">
          <p style={{ marginBottom: 14 }}>
            <Link href={listHref} style={{ color: 'var(--on-blue-dim)' }}>&larr; {listLabel}</Link>
          </p>
          <span className="eyebrow" style={{ color: 'var(--on-blue-dim)' }}>{program.oneOff ? 'Training Program' : 'Coaching Plan'}</span>
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
            <Link href={listHref} className="btn btn-outline">{program.oneOff ? 'Compare Programs' : 'Compare Plans'}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
