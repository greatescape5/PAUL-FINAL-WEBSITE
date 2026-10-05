import { BUSINESS } from '@/lib/site';

const IG_URL = BUSINESS.social.instagram;

// Curated fallback tiles — shown until a live feed is connected, or if the feed
// can't be reached. They link to the profile.
const FALLBACK = [
  '/photos/headshot.png',
  '/photos/coaching.png',
  '/photos/trainer-rack.png',
  '/photos/hiking.png',
  '/photos/sailing.png',
  '/photos/snow.png',
];

type Tile = { img: string; href: string; alt: string };

// Pull the latest posts from a Behold.so feed (https://behold.so). Create a free
// feed there (connect the Instagram account once), then set BEHOLD_FEED_ID in the
// environment. Returns null if not configured or unreachable, so the section
// falls back to the curated tiles and never breaks.
async function fetchLivePosts(): Promise<Tile[] | null> {
  const id = process.env.BEHOLD_FEED_ID;
  if (!id) return null;
  try {
    const res = await fetch(`https://feeds.behold.so/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data: any = await res.json();
    const posts: any[] = Array.isArray(data) ? data : (data.posts ?? []);
    const tiles = posts.slice(0, 6).map((p): Tile => {
      const img =
        p?.sizes?.medium?.mediaUrl ||
        p?.sizes?.small?.mediaUrl ||
        (String(p?.mediaType).toUpperCase() === 'VIDEO' ? p?.thumbnailUrl : p?.mediaUrl) ||
        p?.mediaUrl ||
        p?.thumbnailUrl;
      const caption = (p?.prunedCaption || p?.caption || '').toString().slice(0, 120);
      return { img, href: p?.permalink || IG_URL, alt: caption };
    }).filter((t) => !!t.img);
    return tiles.length ? tiles : null;
  } catch {
    return null;
  }
}

export default async function InstagramFeed() {
  const live = await fetchLivePosts();
  const tiles: Tile[] = live ?? FALLBACK.map((src) => ({ img: src, href: IG_URL, alt: '' }));

  return (
    <section className="section band-blue ig-feed-section">
      <div className="container">
        <div className="center" style={{ marginBottom: 34 }}>
          <span className="eyebrow">{BUSINESS.instagramHandle}</span>
          <h2>Follow me on Instagram</h2>
        </div>

        <div className="ig-feed">
          {tiles.map((t, i) => (
            <a
              key={i}
              className="ig-tile"
              href={t.href}
              target="_blank"
              rel="noopener"
              aria-label={t.alt || `${BUSINESS.instagramHandle} on Instagram`}
            >
              <img src={t.img} alt={t.alt} loading="lazy" />
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
