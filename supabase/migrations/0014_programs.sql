-- ============================================================================
-- Flow Motion PT — CRM
-- 0014: editable programs (packages)
-- ============================================================================
--
-- Moves the coaching programs out of lib/programs.ts and into the database so
-- the client can fully edit them from the admin panel: name, tagline, price,
-- length, "what this is" copy, bullet points, and the PT Distinction sign-up
-- link that the "Get started" button points to.
--
-- The public /programs pages read PUBLISHED rows via the service role; there is
-- no anon policy (consistent with the rest of the schema). price_display is
-- free TEXT — PT Distinction owns pricing and checkout.
-- ============================================================================

create table if not exists programs (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null default '',
  tagline       text not null default '',
  description   text not null default '',     -- long "what this is" copy
  price_display text not null default '',
  price_note    text not null default '',
  term_options  text not null default '',
  features      jsonb not null default '[]'::jsonb,   -- string[]
  cover_image   text not null default '',
  cta_label     text not null default '',
  ptd_url       text not null default '',
  featured      boolean not null default false,
  published     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists programs_order on programs (sort_order);

alter table programs enable row level security;

drop policy if exists programs_authenticated on programs;
create policy programs_authenticated on programs
  for all to authenticated using (true) with check (true);

-- Seed with the three programs currently in lib/programs.ts (only if empty).
insert into programs (slug, name, tagline, description, price_display, term_options, features, cover_image, featured, published, sort_order)
select * from (values
  (
    'self-guided', 'Self-Guided Training', 'Your custom plan, on your schedule.',
    'A training and nutrition plan built specifically for your goals, delivered through the PT Distinction app so you can train whenever and wherever works. Perfect if you want expert programming and structure while running the day-to-day yourself.',
    '$99/mo', 'Monthly · 3 or 6 month',
    '["Custom training program built around your goals","Delivered in the PT Distinction app","Exercise video library and technique cues","Nutrition guidelines and habit targets","Program refreshed every 4 weeks","Email support when you need it"]'::jsonb,
    '/photos/trainer-rack.png', false, true, 10
  ),
  (
    '1-1-coaching', '1:1 Online Coaching', 'Full coaching, built around your life.',
    'The complete 1:1 experience. Fully individualized training and nutrition, direct communication with Paul, and the accountability that actually makes results stick — all without stepping foot in a gym on his schedule.',
    '$199/mo', '3, 6, or 12 month',
    '["Everything in Self-Guided, plus:","Fully individualized training and nutrition","Direct 1:1 messaging with Paul","Weekly check-ins and progress reviews","Form checks on your key lifts","Ongoing adjustments as life changes","Real accountability that keeps you moving"]'::jsonb,
    '/photos/coaching.png', true, true, 20
  ),
  (
    'premium-coaching', 'Premium Coaching', 'The highest-touch experience.',
    'For those who want the most support and the fastest progress. Everything in 1:1 Coaching plus scheduled video calls, priority communication, and deeper coaching across nutrition, recovery, and lifestyle.',
    '$349/mo', '3, 6, or 12 month',
    '["Everything in 1:1 Coaching, plus:","Scheduled video coaching calls","Priority messaging with same-day replies","Deeper nutrition coaching","Sleep, recovery, and lifestyle guidance","Quarterly goal-setting sessions"]'::jsonb,
    '/photos/headshot.png', false, true, 30
  )
) as seed
where not exists (select 1 from programs);
