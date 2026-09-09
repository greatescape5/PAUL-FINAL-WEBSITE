-- ============================================================================
-- Flow Motion PT — CRM
-- 0009: newsletter subscribers
-- ============================================================================
--
-- Email sign-ups for the monthly newsletter. The public site writes here via
-- the service role (the /api/subscribe route), so — like leads — there is no
-- anon policy; only authenticated CRM users can read/manage the list.
--
-- `source` records where they signed up ('popup', 'footer', …) and
-- `source_detail` keeps the landing page / referrer / UTMs for context.
-- ============================================================================

create table if not exists subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  name            text,
  source          text not null default 'website',
  status          text not null default 'subscribed',   -- 'subscribed' | 'unsubscribed'
  source_detail   jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- One row per email (case-insensitive); re-subscribes update the same row.
create unique index if not exists subscribers_email_unique on subscribers (lower(email));
create index if not exists subscribers_created on subscribers (created_at desc);

alter table subscribers enable row level security;

drop policy if exists subscribers_authenticated on subscribers;
create policy subscribers_authenticated on subscribers
  for all to authenticated using (true) with check (true);
