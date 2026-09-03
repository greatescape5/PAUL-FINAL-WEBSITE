import { BUSINESS } from '@/lib/site';

const IG_URL = BUSINESS.social.instagram;

// Tiles for the "Follow me on Instagram" strip.
//
// This is the interim, always-works version: curated photos that link to the
// profile. To show his ACTUAL latest posts (auto-updating), connect a feed
// widget (e.g. behold.so or lightwidget.com — both free) to his Instagram once,
// then drop the widget embed in place of this <div className="ig-feed">…</div>.
// The section chrome (band, heading, CTA) stays the same either way.
const TILES = [
  '/photos/headshot.png',
  '/photos/coaching.png',
  '/photos/trainer-rack.png',
  '/photos/hiking.png',
  '/photos/sailing.png',
  '/photos/snow.png',
];

export default function InstagramFeed() {
  return (
    <section className="section band-blue ig-feed-section">
      <div className="container">
        <div className="center" style={{ marginBottom: 34 }}>
          <span className="eyebrow">{BUSINESS.instagramHandle}</span>
          <h2>Follow me on Instagram</h2>
        </div>

        <div className="ig-feed">
          {TILES.map((src, i) => (
            <a
              key={i}
              className="ig-tile"
              href={IG_URL}
              target="_blank"
              rel="noopener"
              aria-label={`${BUSINESS.instagramHandle} on Instagram`}
            >
              <img src={src} alt="" loading="lazy" />
              <span className="ig-tile-ic" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none"/></svg>
              </span>
            </a>
          ))}
        </div>

        <div className="center" style={{ marginTop: 32 }}>
          <a href={IG_URL} target="_blank" rel="noopener" className="btn btn-outline">
            Follow {BUSINESS.instagramHandle}
          </a>
        </div>
      </div>
    </section>
  );
}
