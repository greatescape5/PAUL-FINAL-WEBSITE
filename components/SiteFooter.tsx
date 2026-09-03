import Link from 'next/link';
import { BUSINESS } from '@/lib/site';

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div style={{ maxWidth: 340 }}>
            <h4>{BUSINESS.name}</h4>
            <p style={{ margin: 0 }}>
              Evidence-based 1:1 online fitness coaching — building strength,
              confidence, and sustainable habits around your real life.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <p style={{ margin: '0 0 6px' }}><Link href="/">Home</Link></p>
            <p style={{ margin: '0 0 6px' }}><Link href="/about">About</Link></p>
            <p style={{ margin: 0 }}><Link href="/contact">Contact</Link></p>
          </div>
          <div>
            <h4>Get in Touch</h4>
            <p style={{ margin: '0 0 6px' }}><a href={`tel:${BUSINESS.phoneE164}`}>{BUSINESS.phoneDisplay}</a></p>
            <p style={{ margin: '0 0 6px' }}><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p>
            <p style={{ margin: '0 0 10px' }}>{BUSINESS.address.city}, {BUSINESS.address.region}</p>
            <p style={{ margin: 0 }}>
              <a href={BUSINESS.social.instagram} target="_blank" rel="noopener">{BUSINESS.instagramHandle}</a>
            </p>
          </div>
        </div>
        <div className="fine">
          <span>
            © {year} {BUSINESS.name}
            {/* Hidden admin link — a faint period to the owner login. */}
            <Link href="/admin" className="admin-dot" aria-label="Admin">.</Link>
          </span>
          <span>{BUSINESS.address.city}, {BUSINESS.address.region} · Coaching worldwide</span>
        </div>
        <p className="credit">
          Website designed and managed by{' '}
          <a href="https://greatescapewebservices.com" target="_blank" rel="noopener">
            Great Escape Web &amp; Business Services
          </a>
        </p>
      </div>
    </footer>
  );
}
