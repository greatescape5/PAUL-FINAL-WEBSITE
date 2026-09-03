'use client';

import { useEffect } from 'react';

// The App Router doesn't scroll to #anchors on initial load — this makes
// deep links like /contact#get-in-touch land on the right section.
export default function HashScroll() {
  useEffect(() => {
    const { hash } = window.location;
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 60);
  }, []);
  return null;
}
