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
              <span className="eyebrow">About Your Trainer</span>
              <h1>Build lean muscle, lose body fat, and feel your <em>best</em>.</h1>
              <p style={{ maxWidth: 520 }}>
                Online fitness coaching provides custom exercise and nutrition
                programs, direct communication &amp; support, and guidance in every
                health- and fitness-related area. Simply put, <em>a coach dedicated
                to your fitness.</em>
              </p>
              <div className="btn-row" style={{ marginTop: 10 }}>
                <Link href="/contact#get-in-touch" className="btn btn-primary">Start The Conversation</Link>
              </div>
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

      {/* PHILOSOPHY / MEET YOUR COACH */}
      <section className="section">
        <div className="container">
          <div className="media-row">
            <div className="media-photo" style={{ ['--photo' as string]: "url('/photos/hiking.png')" }} />
            <div>
              <span className="eyebrow">The Philosophy</span>
              <h2>Fitness that fits into a full life</h2>
              <p>
                Training shouldn&rsquo;t mean living in the gym. The goal is a body and
                a base of strength that let you say yes to more — hiking a mountain,
                keeping up with your kids, sailing, skiing, moving through the world
                without pain.
              </p>
              <p>
                We&rsquo;ll establish your goals, build a plan that fits your schedule,
                and adjust as life happens. Direct communication and real
                accountability keep it moving, so your results last for decades — not
                weeks.
              </p>
            </div>
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
              I&rsquo;d be happy to discuss your initial goals and guide you toward a 1:1
              training plan that works for you and your life.
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
