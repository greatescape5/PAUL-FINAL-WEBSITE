-- ============================================================================
-- Flow Motion PT — CRM
-- 0015: reviewed package lineup + one-off (At the Gym / At Home) variants
-- ============================================================================
--
-- Replaces the placeholder programs with the reviewed lineup: three one-off
-- programs (each sold in an "At the Gym" and "At Home" version at the same
-- price) and three recurring plans. One-off programs get two sign-up links so
-- the client can drop in a PT Distinction link per version.
-- ============================================================================

alter table programs add column if not exists one_off       boolean not null default false;
alter table programs add column if not exists ptd_url_home  text not null default '';
alter table programs add column if not exists ptd_url_gym   text not null default '';

-- Swap in the new lineup (idempotent: clears the old + new slugs first).
delete from programs where slug in (
  'self-guided','1-1-coaching','premium-coaching',
  'starter','kickstart','transformation','build','accountability'
);

insert into programs
  (slug, name, tagline, description, price_display, price_note, term_options, features, cover_image, one_off, featured, published, sort_order)
values
  (
    'starter', 'Starter', 'A focused first month — gym or home.',
    'A focused four-week starter program in a single training phase. Pick the At the Gym or At Home version to match your setup — same price, same structure. You get full app access, the exercise video library, and workout logging, with an upgrade offer when you finish.',
    '$49', 'One-time', '4 weeks · single phase',
    '["4 weeks, single training phase","Choose At the Gym or At Home","Full app access","Exercise video library","Workout logging","Upgrade offer at completion"]'::jsonb,
    '/photos/trainer-rack.png', true, false, true, 10
  ),
  (
    'kickstart', 'Kickstart', 'Eight weeks, two progressive phases.',
    'An eight-week program across two progressive phases, in your choice of At the Gym or At Home. Everything in Starter plus a halfway check-in to keep you on track, with an upgrade offer at completion.',
    '$79', 'One-time', '8 weeks · two phases',
    '["8 weeks, two progressive phases","Choose At the Gym or At Home","Everything in Starter, plus:","Halfway check-in","Upgrade offer at completion"]'::jsonb,
    '/photos/productive.jpg', true, false, true, 20
  ),
  (
    'transformation', 'Transformation', 'A full twelve-week transformation.',
    'A full twelve-week transformation across three progressive phases, in At the Gym or At Home. Everything in Kickstart plus a mid-point reassessment to recalibrate your plan.',
    '$109', 'One-time', '12 weeks · three phases',
    '["12 weeks, three progressive phases","Choose At the Gym or At Home","Everything in Kickstart, plus:","Mid-point reassessment","Upgrade offer at completion"]'::jsonb,
    '/photos/simple.jpg', true, false, true, 30
  ),
  (
    'build', 'Build', 'Ongoing training that keeps progressing.',
    'Ongoing training with workout optimization and automatic program progression, delivered in the app. Full app access, the exercise library, workout logging, and habit tracking, with a quarterly check-in.',
    '$99/mo', '', 'Monthly',
    '["Ongoing training and progression","Workout optimization","Full app access and exercise library","Workout logging and habit tracking","Quarterly check-in"]'::jsonb,
    '/photos/coaching.png', false, false, true, 40
  ),
  (
    'accountability', 'Accountability', 'Real accountability, month to month.',
    'Everything in Build, with real accountability — a diet review, a monthly check-in with written feedback, direct messaging, form-check video review, and programming adjusted month to month.',
    '$249/mo', '', 'Monthly',
    '["Everything in Build, plus:","Diet review","Monthly check-in with written feedback","Direct messaging","Form-check video review","Programming adjusted monthly"]'::jsonb,
    '/photos/enjoyable.jpg', false, true, true, 50
  ),
  (
    '1-1-coaching', '1:1 Coaching', 'The complete, bespoke experience.',
    'The full 1:1 experience. Everything in Accountability plus priority access with same-day replies, fully bespoke programming, and regular video calls. 3, 6, or 12-month term with a signed agreement.',
    '$449/mo', '', '3, 6, or 12 month',
    '["Everything in Accountability, plus:","Priority access, same-day replies","Fully bespoke programming","Regular video calls","3, 6, or 12-month term"]'::jsonb,
    '/photos/headshot.png', false, false, true, 60
  );
