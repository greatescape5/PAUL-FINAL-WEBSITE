-- ============================================================================
-- Flow Motion PT — CRM
-- 0016: split one-off programs into separate At the Gym / At Home cards
-- ============================================================================
--
-- Instead of one card with two buttons, each one-off program is now its own
-- card and its own PT Distinction link: "Starter — At the Gym" and
-- "Starter — At Home", and likewise for Kickstart and Transformation. Six
-- one-off cards + the three recurring plans (untouched).
-- ============================================================================

-- Clear the single one-off rows and any prior variant rows (idempotent).
delete from programs where slug in (
  'starter','kickstart','transformation',
  'starter-gym','starter-home','kickstart-gym','kickstart-home',
  'transformation-gym','transformation-home'
);

insert into programs
  (slug, name, tagline, description, price_display, price_note, term_options, features, cover_image, one_off, featured, published, sort_order)
values
  (
    'starter-gym', 'Starter — At the Gym', 'A focused first month, built for the gym.',
    'A focused four-week starter program in a single training phase, built for a fully-equipped gym. Full app access, the exercise video library, and workout logging, with an upgrade offer when you finish.',
    '$49', 'One-time', '4 weeks · single phase',
    '["4 weeks, single training phase","Built for a fully-equipped gym","Full app access","Exercise video library","Workout logging","Upgrade offer at completion"]'::jsonb,
    '/photos/trainer-rack.png', true, false, true, 10
  ),
  (
    'starter-home', 'Starter — At Home', 'A focused first month you can do at home.',
    'A focused four-week starter program in a single training phase, designed for training at home with minimal equipment. Full app access, the exercise video library, and workout logging, with an upgrade offer when you finish.',
    '$49', 'One-time', '4 weeks · single phase',
    '["4 weeks, single training phase","Designed for home, minimal equipment","Full app access","Exercise video library","Workout logging","Upgrade offer at completion"]'::jsonb,
    '/photos/productive.jpg', true, false, true, 15
  ),
  (
    'kickstart-gym', 'Kickstart — At the Gym', 'Eight weeks in the gym, two phases.',
    'An eight-week program across two progressive phases, built for a fully-equipped gym. Everything in Starter plus a halfway check-in, with an upgrade offer at completion.',
    '$79', 'One-time', '8 weeks · two phases',
    '["8 weeks, two progressive phases","Built for a fully-equipped gym","Everything in Starter, plus:","Halfway check-in","Upgrade offer at completion"]'::jsonb,
    '/photos/hiking.png', true, false, true, 20
  ),
  (
    'kickstart-home', 'Kickstart — At Home', 'Eight weeks at home, two phases.',
    'An eight-week program across two progressive phases, designed for training at home with minimal equipment. Everything in Starter plus a halfway check-in, with an upgrade offer at completion.',
    '$79', 'One-time', '8 weeks · two phases',
    '["8 weeks, two progressive phases","Designed for home, minimal equipment","Everything in Starter, plus:","Halfway check-in","Upgrade offer at completion"]'::jsonb,
    '/photos/simple.jpg', true, false, true, 25
  ),
  (
    'transformation-gym', 'Transformation — At the Gym', 'Twelve weeks in the gym, three phases.',
    'A full twelve-week transformation across three progressive phases, built for a fully-equipped gym. Everything in Kickstart plus a mid-point reassessment to recalibrate your plan.',
    '$109', 'One-time', '12 weeks · three phases',
    '["12 weeks, three progressive phases","Built for a fully-equipped gym","Everything in Kickstart, plus:","Mid-point reassessment","Upgrade offer at completion"]'::jsonb,
    '/photos/snow.png', true, false, true, 30
  ),
  (
    'transformation-home', 'Transformation — At Home', 'Twelve weeks at home, three phases.',
    'A full twelve-week transformation across three progressive phases, designed for training at home with minimal equipment. Everything in Kickstart plus a mid-point reassessment to recalibrate your plan.',
    '$109', 'One-time', '12 weeks · three phases',
    '["12 weeks, three progressive phases","Designed for home, minimal equipment","Everything in Kickstart, plus:","Mid-point reassessment","Upgrade offer at completion"]'::jsonb,
    '/photos/sailing.png', true, false, true, 35
  );
