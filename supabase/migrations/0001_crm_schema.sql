-- ============================================================================
-- Flow Motion PT — CRM schema
-- 0001: tables, constraints, indexes, RLS
-- ============================================================================
--
-- Design notes for whoever picks this up:
--
-- 1. ONE contacts table. A lead becomes a client becomes a paused client
--    becomes a past client. They are the same person and the same row.
--    The legacy spreadsheet used three separate sections and that is the
--    direct cause of every duplicate in it.
--
-- 2. lifecycle is TEXT + CHECK, not a Postgres ENUM. Enums require a
--    migration to add a value and cannot drop one at all. Paul will want a
--    new state eventually.
--
-- 3. NOTHING here hard-deletes. archived_at only. Wrong entries get
--    corrected or archived, never destroyed, because the entire point of
--    this system is that mistakes are cheap to fix.
--
-- 4. activities is append-only and is both the client timeline AND the
--    audit log AND the undo stack. Do not update or delete rows in it.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- stages — pipeline stages are DATA, so renaming one is a UI action, not a
-- code deploy.
-- ---------------------------------------------------------------------------
create table stages (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  sort_order  int         not null,
  color       text        not null default '#64748b',
  is_default  boolean     not null default false,  -- where new form leads land
  is_terminal boolean     not null default false,  -- "not interested" etc.
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create unique index stages_one_default
  on stages (is_default) where is_default and archived_at is null;

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
create table contacts (
  id              uuid primary key default gen_random_uuid(),

  full_name       text not null,
  email           citext,
  phone           text,

  -- lead        : enquiry, not paying
  -- client      : actively paying
  -- paused      : injury, travel, medical leave — INTENDS to return.
  --               This state is the fix for the duplicate rows in the
  --               legacy sheet. Paused clients keep their rate.
  -- past_client : churned
  lifecycle       text not null default 'lead'
                  check (lifecycle in ('lead','client','paused','past_client')),

  stage_id        uuid references stages(id) on delete set null,

  monthly_rate    numeric(8,2) check (monthly_rate >= 0),
  payment_method  text not null default 'stripe'
                  check (payment_method in ('stripe','venmo','cash','other')),

  interest        text,          -- package/tier they asked about
  source          text,          -- contact_form | instagram | referral | manual | import
  source_detail   jsonb not null default '{}'::jsonb,  -- utm_*, referrer, landing page

  follow_up_on    date,
  started_on      date,
  paused_on       date,
  expected_return date,          -- set when pausing; drives the follow-up nag
  cancelled_on    date,

  ptd_client_ref  text,          -- PT Distinction identifier, set manually
  converted_at    timestamptz,

  -- Set by the import when a row needed a human decision. The UI shows a
  -- banner until it is cleared. Never blocks anything.
  needs_review    text,

  archived_at     timestamptz,
  merged_into     uuid references contacts(id) on delete set null,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- The "who is waiting on me" query must be a single index hit.
create index contacts_follow_up
  on contacts (follow_up_on)
  where archived_at is null and merged_into is null;

create index contacts_lifecycle_stage
  on contacts (lifecycle, stage_id)
  where archived_at is null and merged_into is null;

create index contacts_active
  on contacts (lifecycle)
  where archived_at is null and merged_into is null;

create index contacts_needs_review
  on contacts (needs_review)
  where needs_review is not null and archived_at is null;

-- Soft-unique on email: duplicates are ALLOWED to land (the import will
-- create some, and Paul may type one twice) but the UI can detect them and
-- offer a merge. A hard constraint here would make bad data un-enterable
-- rather than fixable, which is the opposite of what we want.
create index contacts_email on contacts (email) where email is not null;
create index contacts_phone on contacts (phone) where phone is not null;

-- ---------------------------------------------------------------------------
-- activities — append-only timeline / audit log / undo stack
-- ---------------------------------------------------------------------------
create table activities (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references contacts(id) on delete cascade,

  -- note            : free text Paul typed
  -- lifecycle_change: meta = {from, to}
  -- stage_change    : meta = {from, to}
  -- rate_change     : meta = {from, to, rate_change_id}
  -- form_submission : meta = raw payload
  -- merge / unmerge : meta = {other_contact_id}
  -- system          : anything automated
  kind        text not null
              check (kind in ('note','lifecycle_change','stage_change',
                              'rate_change','form_submission','merge',
                              'unmerge','system')),

  body        text,
  meta        jsonb not null default '{}'::jsonb,

  -- Set when this activity has been reversed by undo. The original row is
  -- kept so the history stays honest about the mistake.
  undone_at   timestamptz,

  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create index activities_contact on activities (contact_id, created_at desc);
create index activities_undoable
  on activities (contact_id, created_at desc)
  where undone_at is null
    and kind in ('lifecycle_change','stage_change','rate_change');

-- ---------------------------------------------------------------------------
-- rate_changes
--
-- This table is the single highest-value thing in the schema. In the legacy
-- sheet, scheduled price changes lived in free-text notes with no year and
-- nothing watching them, and at least one ("return to original $299 price
-- July 30th") silently lapsed at roughly $200/month.
--
-- applied_at IS NULL + effective_on <= today == overdue money. That predicate
-- is the first thing on the home screen.
-- ---------------------------------------------------------------------------
create table rate_changes (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references contacts(id) on delete cascade,

  from_rate    numeric(8,2),
  to_rate      numeric(8,2) not null check (to_rate >= 0),
  effective_on date not null,

  -- Deliberately NOT auto-applied. Stripe is the source of truth for what
  -- is actually billed; this system cannot change a Stripe subscription.
  -- Paul taps "applied" once he has made the change in Stripe, which keeps
  -- the two in sync instead of quietly drifting apart.
  applied_at   timestamptz,

  reason       text,
  cancelled_at timestamptz,      -- scheduled then thought better of it

  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create index rate_changes_pending
  on rate_changes (effective_on)
  where applied_at is null and cancelled_at is null;

create index rate_changes_contact
  on rate_changes (contact_id, effective_on desc);

-- ---------------------------------------------------------------------------
-- subscribers — mailing list. DIFFERENT PEOPLE from contacts.
-- Following his work, not paying him, never enter PT Distinction.
-- contact_id is a nullable link for the overlap, not a foreign key spine.
-- ---------------------------------------------------------------------------
create table subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           citext not null unique,
  full_name       text,
  status          text not null default 'subscribed'
                  check (status in ('subscribed','unsubscribed','bounced')),
  source          text,
  contact_id      uuid references contacts(id) on delete set null,
  confirmed_at    timestamptz,
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now()
);

create index subscribers_status on subscribers (status);

-- ---------------------------------------------------------------------------
-- contact_merges — every merge is reversible
-- ---------------------------------------------------------------------------
create table contact_merges (
  id          uuid primary key default gen_random_uuid(),
  kept_id     uuid not null references contacts(id) on delete cascade,
  merged_id   uuid not null references contacts(id) on delete cascade,
  snapshot    jsonb not null,          -- the merged row, verbatim, pre-merge
  reversed_at timestamptz,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger contacts_touch before update on contacts
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — two humans use this app and it still gets locked down. A leaked
-- anon key should expose nothing.
-- ---------------------------------------------------------------------------
alter table stages         enable row level security;
alter table contacts       enable row level security;
alter table activities     enable row level security;
alter table rate_changes   enable row level security;
alter table subscribers    enable row level security;
alter table contact_merges enable row level security;

do $$
declare t text;
begin
  foreach t in array array['stages','contacts','activities','rate_changes',
                           'subscribers','contact_merges']
  loop
    execute format(
      'create policy %I_authenticated on %I for all
         to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- The public contact form writes via a service-role route handler, NOT via
-- the anon key. There is deliberately no anon policy anywhere.

-- ---------------------------------------------------------------------------
-- Seed stages
-- ---------------------------------------------------------------------------
insert into stages (name, sort_order, color, is_default, is_terminal) values
  ('New',            10, '#3b82f6', true,  false),
  ('Contacted',      20, '#8b5cf6', false, false),
  ('Consult booked', 30, '#f59e0b', false, false),
  ('Ready to start', 40, '#10b981', false, false),
  ('Not interested', 50, '#94a3b8', false, true);
