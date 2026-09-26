import Link from 'next/link';
import type { Program } from '@/lib/programs';

// Shared card grid for the Coaching (recurring) and Programs (one-off) pages.
export default function ProgramGrid({
  programs, emptyNote,
}: {
  programs: Program[];
  emptyNote?: string;
}) {
  if (programs.length === 0) {
    return <div className="empty-note">{emptyNote ?? 'Coming soon — check back shortly.'}</div>;
  }
  return (
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
            <h3><Link href={`/programs/${p.slug}`} className="program-title-link">{p.name}</Link></h3>
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
  );
}
