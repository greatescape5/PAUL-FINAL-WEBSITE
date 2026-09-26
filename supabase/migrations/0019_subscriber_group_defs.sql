-- ============================================================================
-- Flow Motion PT — CRM
-- 0019: subscriber group definitions
-- ============================================================================
--
-- Groups were until now implicit (the distinct group_name values on
-- subscribers), so an empty group couldn't exist. This table lets the client
-- create and keep groups (including empty ones) from the Groups tab. Existing
-- group names are seeded in.
-- ============================================================================

create table if not exists subscriber_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

alter table subscriber_groups enable row level security;

drop policy if exists subscriber_groups_authenticated on subscriber_groups;
create policy subscriber_groups_authenticated on subscriber_groups
  for all to authenticated using (true) with check (true);

-- Seed from group names already in use, plus the default.
insert into subscriber_groups (name)
select distinct group_name from subscribers
on conflict (name) do nothing;

insert into subscriber_groups (name) values ('Website')
on conflict (name) do nothing;
