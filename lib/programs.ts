// ============================================================
// PROGRAMS (a.k.a. "packages")
//
// Edit this file to manage the coaching programs shown on /programs and
// /programs/[slug]. This is the interim, config-driven source of truth.
//
// It intentionally mirrors the Phase 4 `packages` DB schema so it can move to
// Supabase + the admin later with no page changes:
//   name · slug · tagline · description · priceDisplay (TEXT) · termOptions
//   · features (string[]) · coverImage · ptdUrl (PT Distinction) · published
//
// IMPORTANT: `priceDisplay` is TEXT for display only — this site never
// calculates or charges anything. PT Distinction owns pricing and payment.
// ============================================================

export type Program = {
  slug: string;
  name: string;
  tagline: string;
  description: string;      // longer copy for the detail page
  priceDisplay: string;     // e.g. "$199/mo" — display only, never used in logic
  priceNote?: string;       // small print under the price, e.g. "billed monthly"
  termOptions: string;      // e.g. "3, 6, or 12 month"
  features: string[];       // what's included
  coverImage: string;       // /photos/...
  ctaLabel?: string;        // button label (defaults to "Get Started")
  ptdUrl?: string;          // PT Distinction signup/embed URL. Empty → routes to /contact for now.
  featured?: boolean;       // highlights the card as "Most Popular"
  published: boolean;       // hide from the site without deleting
};

// TODO (Paul): replace names, prices, inclusions, and cover images with the
// real programs. Prices below are PLACEHOLDERS.
export const PROGRAMS: Program[] = [
  {
    slug: 'self-guided',
    name: 'Self-Guided Training',
    tagline: 'Your custom plan, on your schedule.',
    description:
      'A training and nutrition plan built specifically for your goals, delivered through the PT Distinction app so you can train whenever and wherever works. Perfect if you want expert programming and structure while running the day-to-day yourself.',
    priceDisplay: '$99/mo',
    priceNote: 'Placeholder pricing — update in lib/programs.ts',
    termOptions: 'Monthly · 3 or 6 month',
    features: [
      'Custom training program built around your goals',
      'Delivered in the PT Distinction app',
      'Exercise video library and technique cues',
      'Nutrition guidelines and habit targets',
      'Program refreshed every 4 weeks',
      'Email support when you need it',
    ],
    coverImage: '/photos/trainer-rack.png',
    published: true,
  },
  {
    slug: '1-1-coaching',
    name: '1:1 Online Coaching',
    tagline: 'Full coaching, built around your life.',
    description:
      'The complete 1:1 experience. Fully individualized training and nutrition, direct communication with Paul, and the accountability that actually makes results stick — all without stepping foot in a gym on his schedule.',
    priceDisplay: '$199/mo',
    priceNote: 'Placeholder pricing — update in lib/programs.ts',
    termOptions: '3, 6, or 12 month',
    features: [
      'Everything in Self-Guided, plus:',
      'Fully individualized training and nutrition',
      'Direct 1:1 messaging with Paul',
      'Weekly check-ins and progress reviews',
      'Form checks on your key lifts',
      'Ongoing adjustments as life changes',
      'Real accountability that keeps you moving',
    ],
    coverImage: '/photos/coaching.png',
    featured: true,
    published: true,
  },
  {
    slug: 'premium-coaching',
    name: 'Premium Coaching',
    tagline: 'The highest-touch experience.',
    description:
      'For those who want the most support and the fastest progress. Everything in 1:1 Coaching plus scheduled video calls, priority communication, and deeper coaching across nutrition, recovery, and lifestyle.',
    priceDisplay: '$349/mo',
    priceNote: 'Placeholder pricing — update in lib/programs.ts',
    termOptions: '3, 6, or 12 month',
    features: [
      'Everything in 1:1 Coaching, plus:',
      'Scheduled video coaching calls',
      'Priority messaging with same-day replies',
      'Deeper nutrition coaching',
      'Sleep, recovery, and lifestyle guidance',
      'Quarterly goal-setting sessions',
    ],
    coverImage: '/photos/headshot.png',
    published: true,
  },
];

// Published programs, in order.
export function getPrograms(): Program[] {
  return PROGRAMS.filter((p) => p.published);
}

// A single published program by slug (unpublished → undefined, so it 404s).
export function getProgram(slug: string): Program | undefined {
  return PROGRAMS.find((p) => p.slug === slug && p.published);
}
