import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Your Trainer',
  description:
    'Evidence-based fitness & movement coaching. Build lean muscle, lose body fat, and feel your best with 1:1 online coaching dedicated to your fitness.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Your Trainer | Flow Motion Personal Training',
    description:
      'Build lean muscle, lose body fat, and feel your best with 1:1 online coaching dedicated to your fitness.',
    url: '/about',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <>
      {/* SPLIT HERO — lighter-blue field framing a darker copy panel */}
      <section className="split-hero">
        <div className="container" style={{ padding: 0, maxWidth: 'none' }}>
          <div className="split">
            <div
              className="split-photo"
              style={{ ['--split-image' as string]: "url('/photos/headshot.png')" }}
              role="img"
              aria-label="Your coach at the gym"
            />
            <div className="split-copy">
              <span className="eyebrow">Flow to get there. Flow Together.</span>
              <h1>Build lean muscle, lose body fat, and feel your <em>best</em>.</h1>
              <p style={{ maxWidth: 520 }}>
                Online fitness coaching bridges the gap between knowledge and
                execution, with custom diet and exercise plans, direct support, and
                guidance in every fitness-related area. Simply put, <em>a coach
                dedicated to your fitness.</em>
              </p>
              <div className="btn-row" style={{ marginTop: 10 }}>
                <Link href="/contact#get-in-touch" className="btn btn-primary">Start The Conversation</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHILOSOPHY / MEET YOUR COACH */}
      <section className="section">
        <div className="container">
          <div className="media-row">
            <div className="media-photo" style={{ ['--photo' as string]: "url('/photos/hiking.png')" }} />
            <div>
              <span className="eyebrow">The Philosophy</span>
              <h2>Fitness that fits your life</h2>
              <p>
                If you&rsquo;re looking for fast-track results derived from restrictive
                diets and aggressive exercise, look elsewhere, that&rsquo;s not me.
              </p>
              <p>
                But, if you connect with a workout program that compliments life
                responsibility, a diet that fuels your physical &amp; emotional needs,
                and a holistic approach that meets you where you&rsquo;re at, look no
                further.
              </p>
              <p>
                My name is Paul and over the last 7 years, I have helped 100s of
                everyday adults build strength, boost daily performance, and improve
                self confidence, without dedicating their life to fitness.
              </p>
              <p>
                I work with people of varying socio-economic environments, unique
                physical capabilities, and the full spectrum of exercise enthusiasts
                from advanced athletes to those who would happily avoid a gym.
              </p>
              <p>
                The philosophy at Flow Motion blends fitness with seasonality, using
                tools that adapt diet &amp; exercise to match your ability to adhere to
                your plan.
              </p>
              <p>
                Fitness done well enhances your life, recreation, and confidence,
                regardless of motivation; fitness should not take from it. However,
                much of the wellness industry feeds off of extremes, fads, and newness.
              </p>
              <p>
                A reliable, life-long fitness routine flows to get there: balancing
                structure with freedom, accountability with self-efficacy, and
                practicality with enjoyment.
              </p>
              <p>
                And by working as a team, we flow together: bridging the gap between
                knowledge and execution, and continuously refining a process that
                supports lasting health.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="section band-blue">
        <div className="container">
          <div className="quote">
            <span className="eyebrow">What Clients Say</span>
            <blockquote>
              &ldquo;Paul&rsquo;s personal training is like a five-star concierge
              service. I hadn&rsquo;t trained with a virtual personal trainer before —
              Paul is anything but virtual. He&rsquo;s very engaged, from the workout
              and communication to goal setting, accountability, nutrition, coaching,
              and encouragement. Training at home with Paul has given me next-level
              freedom and the personal support I was missing. My favorite thing is how
              intuitive he is — strong at coaching through the lows as well as the
              highs. Highly recommend.&rdquo;
            </blockquote>
            <div className="who">— Bonnie Wright</div>
          </div>
        </div>
      </section>

      {/* LETS GET STARTED CTA — boxed */}
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <span className="eyebrow" style={{ color: 'var(--blue-mist)' }}>Let&rsquo;s Get Started</span>
            <h2>Let&rsquo;s talk through your goals</h2>
            <p>
              I&rsquo;d be happy to discuss your initial goals and guide you toward a
              training plan that works best for you and your life.
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
