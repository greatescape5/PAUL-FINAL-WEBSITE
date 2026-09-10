-- ============================================================================
-- Flow Motion PT — CRM
-- 0013: multiple saved sign-up CTAs
-- ============================================================================
--
-- Replaces the single newsletter_offer (0012) with a list of reusable CTAs.
-- The client saves as many as he wants in Settings, and picks one to attach
-- to a given newsletter from the Subscriptions page. Any offer already
-- configured in 0012 is carried over so nothing is lost.
-- ============================================================================

create table if not exists newsletter_ctas (
  id            uuid primary key default gen_random_uuid(),
  name          text not null default '',
  price_display text not null default '',
  description   text not null default '',
  button_label  text not null default 'Sign up',
  signup_url    text not null default '',
  created_at    timestamptz not null default now()
);

alter table newsletter_ctas enable row level security;

drop policy if exists newsletter_ctas_authenticated on newsletter_ctas;
create policy newsletter_ctas_authenticated on newsletter_ctas
  for all to authenticated using (true) with check (true);

-- Carry over the single 0012 offer, if one was actually filled in.
do $$
begin
  if to_regclass('public.newsletter_offer') is not null then
    insert into newsletter_ctas (name, price_display, description, button_label, signup_url)
    select coalesce(name, ''), coalesce(price_display, ''), coalesce(description, ''),
           coalesce(nullif(button_label, ''), 'Sign up'), coalesce(signup_url, '')
    from newsletter_offer
    where id = 1 and (coalesce(name, '') <> '' or coalesce(signup_url, '') <> '');
  end if;
end $$;
