'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Program } from '@/lib/programs';

function ProgramCard({ p }: { p: Program }) {
  return (
    <div className={`program-card${p.featured ? ' featured' : ''}`}>
      {p.featured && <span className="program-flag">Most Popular</span>}
      <div
        className="program-cover"
        style={{ ['--cover' as string]: `url('${p.coverImage}')` }}
        role="img"
        aria-label={p.name}
      />
      <div className="program-body">
        <h3>{p.name}</h3>
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
  );
}

export default function ProgramsTabs({ programs }: { programs: Program[] }) {
  const recurring = programs.filter((p) => !p.oneOff);
  const oneOff = programs.filter((p) => p.oneOff);

  // Lead with one-off (lower-commitment entry points); fall back if none exist.
  const [tab, setTab] = useState<'recurring' | 'oneoff'>(oneOff.length ? 'oneoff' : 'recurring');

  const list = tab === 'recurring' ? recurring : oneOff;

  if (programs.length === 0) {
    return <div className="empty-note">Programs are coming soon — check back shortly.</div>;
  }

  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <div className="program-tabs" role="tablist">
          {oneOff.length > 0 && (
            <button role="tab" aria-selected={tab === 'oneoff'} className={tab === 'oneoff' ? 'active' : ''} onClick={() => setTab('oneoff')}>
              One-off
            </button>
          )}
          {recurring.length > 0 && (
            <button role="tab" aria-selected={tab === 'recurring'} className={tab === 'recurring' ? 'active' : ''} onClick={() => setTab('recurring')}>
              Recurring
            </button>
          )}
        </div>
        <p className="program-tabs-note">
          {tab === 'recurring'
            ? 'Ongoing coaching, billed monthly — cancel anytime.'
            : 'Pay once, keep the program. Pick your setup at checkout.'}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="empty-note">Nothing here yet — check back soon.</div>
      ) : (
        <div className="program-grid">
          {list.map((p) => <ProgramCard key={p.slug} p={p} />)}
        </div>
      )}
    </>
  );
}
