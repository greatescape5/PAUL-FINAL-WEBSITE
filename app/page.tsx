import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import InstagramFeed from '@/components/InstagramFeed';
import { businessSchema } from '@/lib/seo';
import { BUSINESS } from '@/lib/site';

export const metadata = {
  alternates: { canonical: '/' },
};

// Three headline benefits (from the current site).
const BENEFITS = [
  {
    title: 'Improved Physical Performance',
    text: 'Move through the world with strength, freedom, and without pain.',
  },
  {
    title: 'Confident Appearance',
    text: 'Build a body you are proud of through muscle growth and fat-loss techniques.',
  },
  {
    title: 'Sustainable Habits',
    text: 'Maintain your results for decades, not weeks — zero fad diets or extremes.',
  },
];

// The three-word methodology — each card carries a circular photo.
const PILLARS = [
  { k: 'Simple', text: 'A simple methodology promotes progress, is easier to follow, and is sustainable.', img: '/photos/simple.jpg' },
  { k: 'Productive', text: 'No BS — a balanced, practical approach that produces real results.', img: '/photos/productive.jpg' },
  { k: 'Enjoyable', text: 'Create fun in the exercise process and celebrate positive change along the way.', img: '/photos/enjoyable.jpg' },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={businessSchema()} />

      {/* HERO */}
      <section
        className="hero home-hero"
        style={{ ['--blue-image' as string]: "url('/photos/hero-mountains.jpg')" }}
      >
        <div className="container center">
          <span className="tag">{BUSINESS.address.city}, {BUSINESS.address.region} · Online Coaching</span>
          <h1>1:1 Online Fitness Coaching</h1>
          <p className="lead" style={{ margin: '10px auto 0' }}>
            A personal training experience, with the freedom your life demands.
          </p>
          <div className="btn-row center" style={{ marginTop: 26 }}>
            <Link href="/contact#get-in-touch" className="btn btn-primary">Start The Conversation</Link>
          </div>
        </div>
      </section>

      {/* EVIDENCE-BASED — layered photo collage + benefits */}
      <section className="section intro-section">
        <div className="container">
          <div className="intro-grid">
            <div className="collage" aria-hidden="true">
              <span className="collage-blob" />
              <img className="collage-photo p1" src="/photos/headshot.png" alt="" />
              <img className="collage-photo p2" src="/photos/snow.png" alt="" />
            </div>
            <div className="intro-copy">
              <span className="eyebrow-red">Evidence-Based Fitness. Life-Based Application.</span>
              <h2 className="intro-head">
                Implementing proven fitness practices into the context of your unique
                life to build and support long-term health
              </h2>
              <div className="benefit-list">
                {BENEFITS.map((b) => (
                  <p key={b.title}><strong>{b.title}:</strong> {b.text}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1:1 ADVANTAGE — two columns on a blue band, no photo */}
      <section className="section band-blue">
        <div className="container">
          <div className="advantage-grid">
            <div className="advantage-head">
              <span className="eyebrow">1:1 Personal Training Advantage</span>
              <h2>A personal training experience, with the freedom your life demands.</h2>
            </div>
            <div className="advantage-points">
              <div className="point">
                <span className="point-ic" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M8 12h7M8 15.5h7M8 19h4"/></svg>
                </span>
                <p>
                  Flow Motion Personal Training provides custom exercise and nutrition
                  programs, direct communication, and guidance in all health and
                  fitness related areas. This space allows for a full integration of
                  fitness practices that you won&rsquo;t find in an in-person setting.
                </p>
              </div>
              <div className="point">
                <span className="point-ic" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="11" width="4.2" height="9" rx="1.3"/><rect x="9.9" y="5" width="4.2" height="15" rx="1.3"/><rect x="16.8" y="14" width="4.2" height="6" rx="1.3"/></svg>
                </span>
                <p>
                  First we establish goals and build a plan that fits your life. Then we
                  work together to execute the program, monitor and track progress, and
                  evolve habits along the way.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MORE THAN A WORKOUT — collage with a single red shape behind the photos */}
      <section className="section feature-section">
        <div className="container">
          <div className="feature-grid">
            <div className="feature-copy">
              <h2 className="feature-head">More Than Just a<br /><em>Workout</em></h2>
              <div className="feature-text">
                <p>
                  Physical freedom is the ability to move through your environment
                  without pain. It&rsquo;s the strength to hike a mountain and the
                  mobility to pick someone off the floor.
                </p>
                <p>
                  Through an integrated exercise routine, we enhance both life&rsquo;s
                  joys and its necessities. Improving <em>physical freedom</em> without
                  dedicating your life to the gym.
                </p>
              </div>
            </div>
            <div className="feature-photos" aria-hidden="true">
              <span className="blob-red" />
              <img className="collage-photo cp1" src="/photos/hiking.png" alt="" />
              <img className="collage-photo cp2" src="/photos/sailing.png" alt="" />
            </div>
          </div>
        </div>
      </section>

      {/* METHODOLOGY — cards with circular photos */}
      <section className="section approach-section">
        <div className="container">
          <div className="center" style={{ marginBottom: 46 }}>
            <span className="eyebrow">The Approach</span>
            <h2 className="approach-head">Maintaining your health is a lifelong effort and I&rsquo;m here to help</h2>
          </div>
          <div className="approach-cards">
            {PILLARS.map((p) => (
              <div key={p.k} className="approach-card">
                <span className="approach-img" style={{ ['--img' as string]: `url('${p.img}')` }} aria-hidden="true" />
                <h3>{p.k}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOLLOW ON INSTAGRAM */}
      <InstagramFeed />

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <span className="eyebrow" style={{ color: 'var(--blue-mist)' }}>Start Your Journey</span>
            <h2>Ready when you are</h2>
            <p>
              Let&rsquo;s connect and chat through your fitness goals to see if 1:1
              online coaching is right for you. Often all it takes is someone else
              invested in you.
            </p>
            <div className="btn-row center">
              <Link href="/contact#get-in-touch" className="btn btn-primary">Start The Conversation</Link>
              <a href={`tel:${BUSINESS.phoneE164}`} className="btn btn-ghost">Call {BUSINESS.phoneDisplay}</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
