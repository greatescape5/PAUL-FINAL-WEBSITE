'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BUSINESS } from '@/lib/site';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/programs', label: 'Programs' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const logoRef = useRef<HTMLImageElement>(null);
  const pathname = usePathname();
  const close = () => setOpen(false);

  // The CRM (/admin) has its own shell — no marketing chrome.
  if (pathname?.startsWith('/admin')) return null;

  // If public/logo.png finishes loading before hydration attaches onLoad, the
  // event is missed — so check the image's state once on mount too.
  useEffect(() => {
    const img = logoRef.current;
    if (img && img.complete && img.naturalWidth > 0) setLogoLoaded(true);
  }, []);

  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" className="brand" onClick={close} aria-label={BUSINESS.name}>
          {/* Styled wordmark shows by default; if public/logo.png exists it loads
              and replaces the text. Drop the real logo (white text, transparent
              background) at public/logo.png. */}
          <span className="brand-fallback" hidden={logoLoaded}>
            Flow Motion<small>Personal Training</small>
          </span>
          <img
            ref={logoRef}
            src="/logo.png"
            alt={BUSINESS.name}
            hidden={!logoLoaded}
            onLoad={() => setLogoLoaded(true)}
          />
        </Link>

        <button
          type="button"
          className={`nav-toggle ${open ? 'open' : ''}`}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={close}
              className={
                (n.href === '/' ? pathname === '/' : pathname === n.href || pathname.startsWith(`${n.href}/`))
                  ? 'active'
                  : ''
              }
            >
              {n.label}
            </Link>
          ))}
          <span className="nav-social">
            <a href={BUSINESS.social.facebook} target="_blank" rel="noopener" aria-label="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>
            </a>
            <a href={BUSINESS.social.instagram} target="_blank" rel="noopener" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            </a>
          </span>
        </nav>
      </div>
    </header>
  );
}
