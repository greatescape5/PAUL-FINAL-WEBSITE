-- ============================================================================
-- Flow Motion PT — CRM
-- 0012: configurable newsletter sign-up CTA (the "featured offer")
-- ============================================================================
--
-- A single, editable promotional offer the client can drop into a newsletter
-- (e.g. "Kickstart — $79.99 for two months") with a PT Distinction sign-up
-- link. Configured in Settings; appended to a newsletter when the composer's
-- "Add the sign-up CTA" box is checked. One row, edited in place.
--
-- `price_display` is free TEXT (never used in any calculation) — PT Distinction
-- still owns pricing and payment.
-- ============================================================================

create table if not exists newsletter_offer (
  id            int primary key default 1,
  enabled       boolean not null default false,
  name          text not null default '',
  price_display text not null default '',
  description   text not null default '',
  button_label  text not null default 'Sign up',
  signup_url    text not null default '',
  updated_at    timestamptz not null default now(),
  constraint newsletter_offer_singleton check (id = 1)
);

insert into newsletter_offer (id) values (1) on conflict (id) do nothing;

alter table newsletter_offer enable row level security;

drop policy if exists newsletter_offer_authenticated on newsletter_offer;
create policy newsletter_offer_authenticated on newsletter_offer
  for all to authenticated using (true) with check (true);
