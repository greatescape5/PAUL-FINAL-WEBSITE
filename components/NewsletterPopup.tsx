'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NewsletterForm from './NewsletterForm';

const SEEN_KEY = 'fm.newsletter.dismissed';
const SHOW_AFTER_MS = 12_000;

// A one-time monthly-newsletter invite. Appears after a short delay, and never
// again once dismissed or subscribed (remembered in localStorage per browser).
export default function NewsletterPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Hide the invite on the CRM and on the client-login page (don't cover the
  // sign-in form).
  const suppressed = pathname?.startsWith('/admin') || pathname === '/client-login';

  useEffect(() => {
    if (suppressed) return;
    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { /* ignore */ }
    if (seen) return;
    const t = setTimeout(() => setOpen(true), SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [suppressed, pathname]);

  function dismiss() {
    setOpen(false);
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
  }

  if (suppressed || !open) return null;

  return (
    <div className="newsletter-pop-backdrop" onClick={dismiss} role="presentation">
      <div
        className="newsletter-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-pop-title"
      >
        <button className="newsletter-pop-close" onClick={dismiss} aria-label="Close">×</button>
        <h3 id="newsletter-pop-title">Get the monthly newsletter</h3>
        <p>
          Training tips, mindset, and the occasional recipe — one email a month,
          no spam. Join the Flow Motion list.
        </p>
        <NewsletterForm source="popup" onSuccess={() => { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ } }} />
      </div>
    </div>
  );
}
