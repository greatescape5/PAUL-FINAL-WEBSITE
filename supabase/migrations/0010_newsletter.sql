-- ============================================================================
-- Flow Motion PT — CRM
-- 0010: newsletter sending (broadcasts, unsubscribe tokens, image storage)
-- ============================================================================
--
-- Adds what's needed to compose and send the monthly newsletter from inside
-- the CRM (via Resend): a per-subscriber unsubscribe token, a log of sent
-- broadcasts, and a public storage bucket for images the newsletter embeds.
-- ============================================================================

-- Per-subscriber token so unsubscribe links work without logging in.
alter table subscribers add column if not exists unsub_token uuid not null default gen_random_uuid();
create unique index if not exists subscribers_unsub_token on subscribers (unsub_token);

-- Log of newsletters that have been sent.
create table if not exists newsletter_broadcasts (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null,
  body_html   text not null,
  sent_count  int not null default 0,
  sent_at     timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);

alter table newsletter_broadcasts enable row level security;

drop policy if exists broadcasts_authenticated on newsletter_broadcasts;
create policy broadcasts_authenticated on newsletter_broadcasts
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Public storage bucket for newsletter images.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('newsletter', 'newsletter', true)
on conflict (id) do nothing;

drop policy if exists "newsletter public read" on storage.objects;
create policy "newsletter public read" on storage.objects
  for select using (bucket_id = 'newsletter');

drop policy if exists "newsletter auth upload" on storage.objects;
create policy "newsletter auth upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'newsletter');
