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
  oneOff?: boolean;         // sold once, in two versions (At the Gym / At Home)
  ptdUrlGym?: string;       // one-off: "At the Gym" (Box Gym) signup link
  ptdUrlHome?: string;      // one-off: "At Home" signup link
  featured?: boolean;       // highlights the card as "Most Popular"
  published: boolean;       // hide from the site without deleting
};

// Fallback lineup, mirrored from migration 0015. The live site reads these from
// the database (lib/programs-server.ts); this array is only used if the DB is
// unreachable, so keep it in sync when the packages change.
export const PROGRAMS: Program[] = [
  {
    slug: 'starter-gym',
    name: 'Starter — At the Gym',
    tagline: 'A focused first month, built for the gym.',
    description:
      'A focused four-week starter program in a single training phase, built for a fully-equipped gym. Full app access, the exercise video library, and workout logging, with an upgrade offer when you finish.',
    priceDisplay: '$49',
    priceNote: 'One-time',
    termOptions: '4 weeks · single phase',
    features: [
      '4 weeks, single training phase',
      'Built for a fully-equipped gym',
      'Full app access',
      'Exercise video library',
      'Workout logging',
      'Upgrade offer at completion',
    ],
    coverImage: '/photos/trainer-rack.png',
    oneOff: true,
    published: true,
  },
  {
    slug: 'starter-home',
    name: 'Starter — At Home',
    tagline: 'A focused first month you can do at home.',
    description:
      'A focused four-week starter program in a single training phase, designed for training at home with minimal equipment. Full app access, the exercise video library, and workout logging, with an upgrade offer when you finish.',
    priceDisplay: '$49',
    priceNote: 'One-time',
    termOptions: '4 weeks · single phase',
    features: [
      '4 weeks, single training phase',
      'Designed for home, minimal equipment',
      'Full app access',
      'Exercise video library',
      'Workout logging',
      'Upgrade offer at completion',
    ],
    coverImage: '/photos/productive.jpg',
    oneOff: true,
    published: true,
  },
  {
    slug: 'kickstart-gym',
    name: 'Kickstart — At the Gym',
    tagline: 'Eight weeks in the gym, two phases.',
    description:
      'An eight-week program across two progressive phases, built for a fully-equipped gym. Everything in Starter plus a halfway check-in, with an upgrade offer at completion.',
    priceDisplay: '$79',
    priceNote: 'One-time',
    termOptions: '8 weeks · two phases',
    features: [
      '8 weeks, two progressive phases',
      'Built for a fully-equipped gym',
      'Everything in Starter, plus:',
      'Halfway check-in',
      'Upgrade offer at completion',
    ],
    coverImage: '/photos/hiking.png',
    oneOff: true,
    published: true,
  },
  {
    slug: 'kickstart-home',
    name: 'Kickstart — At Home',
    tagline: 'Eight weeks at home, two phases.',
    description:
      'An eight-week program across two progressive phases, designed for training at home with minimal equipment. Everything in Starter plus a halfway check-in, with an upgrade offer at completion.',
    priceDisplay: '$79',
    priceNote: 'One-time',
    termOptions: '8 weeks · two phases',
    features: [
      '8 weeks, two progressive phases',
      'Designed for home, minimal equipment',
      'Everything in Starter, plus:',
      'Halfway check-in',
      'Upgrade offer at completion',
    ],
    coverImage: '/photos/simple.jpg',
    oneOff: true,
    published: true,
  },
  {
    slug: 'transformation-gym',
    name: 'Transformation — At the Gym',
    tagline: 'Twelve weeks in the gym, three phases.',
    description:
      'A full twelve-week transformation across three progressive phases, built for a fully-equipped gym. Everything in Kickstart plus a mid-point reassessment to recalibrate your plan.',
    priceDisplay: '$109',
    priceNote: 'One-time',
    termOptions: '12 weeks · three phases',
    features: [
      '12 weeks, three progressive phases',
      'Built for a fully-equipped gym',
      'Everything in Kickstart, plus:',
      'Mid-point reassessment',
      'Upgrade offer at completion',
    ],
    coverImage: '/photos/snow.png',
    oneOff: true,
    published: true,
  },
  {
    slug: 'transformation-home',
    name: 'Transformation — At Home',
    tagline: 'Twelve weeks at home, three phases.',
    description:
      'A full twelve-week transformation across three progressive phases, designed for training at home with minimal equipment. Everything in Kickstart plus a mid-point reassessment to recalibrate your plan.',
    priceDisplay: '$109',
    priceNote: 'One-time',
    termOptions: '12 weeks · three phases',
    features: [
      '12 weeks, three progressive phases',
      'Designed for home, minimal equipment',
      'Everything in Kickstart, plus:',
      'Mid-point reassessment',
      'Upgrade offer at completion',
    ],
    coverImage: '/photos/sailing.png',
    oneOff: true,
    published: true,
  },
  {
    slug: 'build',
    name: 'Build',
    tagline: 'Ongoing training that keeps progressing.',
    description:
      'Ongoing training with workout optimization and automatic program progression, delivered in the app. Full app access, the exercise library, workout logging, and habit tracking, with a quarterly check-in.',
    priceDisplay: '$99/mo',
    termOptions: 'Monthly',
    features: [
      'Ongoing training and progression',
      'Workout optimization',
      'Full app access and exercise library',
      'Workout logging and habit tracking',
      'Quarterly check-in',
    ],
    coverImage: '/photos/coaching.png',
    published: true,
  },
  {
    slug: 'accountability',
    name: 'Accountability',
    tagline: 'Real accountability, month to month.',
    description:
      'Everything in Build, with real accountability — a diet review, a monthly check-in with written feedback, direct messaging, form-check video review, and programming adjusted month to month.',
    priceDisplay: '$249/mo',
    termOptions: 'Monthly',
    features: [
      'Everything in Build, plus:',
      'Diet review',
      'Monthly check-in with written feedback',
      'Direct messaging',
      'Form-check video review',
      'Programming adjusted monthly',
    ],
    coverImage: '/photos/enjoyable.jpg',
    featured: true,
    published: true,
  },
  {
    slug: '1-1-coaching',
    name: '1:1 Coaching',
    tagline: 'The complete, bespoke experience.',
    description:
      'The full 1:1 experience. Everything in Accountability plus priority access with same-day replies, fully bespoke programming, and regular video calls. 3, 6, or 12-month term with a signed agreement.',
    priceDisplay: '$449/mo',
    termOptions: '3, 6, or 12 month',
    features: [
      'Everything in Accountability, plus:',
      'Priority access, same-day replies',
      'Fully bespoke programming',
      'Regular video calls',
      '3, 6, or 12-month term',
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
