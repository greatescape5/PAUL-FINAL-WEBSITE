import type { Metadata } from 'next';
import ContactForm from './ContactForm';
import HashScroll from '@/components/HashScroll';
import { BUSINESS } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Start your journey with 1:1 online fitness coaching. Let’s connect and chat through your goals — reach out to Flow Motion Personal Training in Spokane, WA.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact | Flow Motion Personal Training',
    description:
      'Start your journey with 1:1 online fitness coaching. Let’s connect and chat through your goals.',
    url: '/contact',
    type: 'website',
  },
};

export default function ContactPage() {
  return (
    <>
      <HashScroll />

      {/* SPLIT HERO — lighter-blue field framing a darker copy panel */}
      <section className="split-hero">
        <div className="container" style={{ padding: 0, maxWidth: 'none' }}>
          <div className="split">
            <div
              className="split-photo"
              style={{ ['--split-image' as string]: "url('/photos/coaching.png')" }}
              role="img"
              aria-label="1:1 coaching session"
            />
            <div className="split-copy">
              <span className="eyebrow">Contact</span>
              <h1>Start your journey with <em>1:1 Online Fitness Coaching</em></h1>
              <p style={{ maxWidth: 520 }}>
                Take the first steps toward a healthier, more capable lifestyle —
                geared toward prioritizing your holistic, everyday health and fitness
                needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GET IN TOUCH */}
      <section className="section anchor-offset" id="get-in-touch">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'start', gap: 44 }}>
            <div>
              <span className="eyebrow">Let&rsquo;s Get Started</span>
              <h2>Let&rsquo;s connect and chat through your goals</h2>
              <p>
                Let&rsquo;s see if 1:1 online fitness coaching is right for you — often
                all it takes is someone else invested in <em>you</em>. Send a message
                and I&rsquo;ll get back to you personally.
              </p>
              <div className="card contact-info" style={{ marginTop: 22 }}>
                <div className="ci-row">
                  <span className="ci-ic" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </span>
                  <div>
                    <strong>Phone</strong>
                    <a href={`tel:${BUSINESS.phoneE164}`}>{BUSINESS.phoneDisplay}</a>
                  </div>
                </div>
                <div className="ci-row">
                  <span className="ci-ic" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"/><path d="m22 6-10 7L2 6"/></svg>
                  </span>
                  <div>
                    <strong>Email</strong>
                    <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
                  </div>
                </div>
                <div className="ci-row">
                  <span className="ci-ic" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </span>
                  <div>
                    <strong>Based in</strong>
                    <span>{BUSINESS.address.city}, {BUSINESS.address.region} · Coaching online, everywhere</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 4 }}>Customer Contact Form</h3>
              <p className="form-note" style={{ marginBottom: 18 }}>Tell me a little about what you&rsquo;re after.</p>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
