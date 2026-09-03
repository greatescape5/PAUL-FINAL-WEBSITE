// Central site + business config — single source of truth for the brand,
// contact details, and the SEO data used by metadata, JSON-LD, sitemap, robots,
// and emails. The schema degrades gracefully when a field is blank.

// Canonical origin. Set NEXT_PUBLIC_SITE_URL in the environment (Vercel + .env.local).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.flowmotionpersonaltraining.com'
).replace(/\/+$/, '');

export const BUSINESS = {
  name: 'Flow Motion Personal Training',
  shortName: 'Flow Motion',
  tagline: '1:1 Online Fitness Coaching',
  description:
    'Evidence-based 1:1 online fitness coaching — custom exercise and nutrition programs, direct support, and sustainable habits built around your life. Based in Spokane, WA.',

  // Contact
  phoneDisplay: '208-627-8025',
  phoneE164: '+12086278025',
  email: 'sundquist.personaltraining@gmail.com',

  // He coaches remotely — city/region only, no street address.
  address: {
    street: '',
    city: 'Spokane',
    region: 'WA',
    regionName: 'Washington',
    postalCode: '',
    country: 'US',
  },
  geo: { latitude: '', longitude: '' },

  // Coaching is remote/online — served everywhere, anchored in Spokane.
  areaServed: ['Spokane', 'Washington', 'Online / Remote'],

  priceRange: '$$',

  // Social / external profiles → schema.org sameAs.
  social: {
    instagram: 'https://www.instagram.com/flow.motionpt/',
    facebook: 'https://www.facebook.com/Flow.motionpt',
  },
  instagramHandle: '@flow.motionpt',
} as const;

// Absolute URL helper — prefixes a path with the canonical origin.
export function absoluteUrl(path = ''): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

// The non-empty social URLs, for schema.org sameAs.
export function sameAs(): string[] {
  return Object.values(BUSINESS.social).filter(Boolean);
}
