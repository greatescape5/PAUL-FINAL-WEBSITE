-- ============================================================================
-- Flow Motion PT — CRM
-- 0006: completed follow-up log
-- ============================================================================
--
-- A contact has at most one PENDING follow-up (contacts.follow_up_on). When
-- it's marked done, we snapshot it here and clear follow_up_on — so Today
-- stops nagging and the contact keeps a history of completed follow-ups in
-- its own area (distinct from the accountability check-ins).
-- ============================================================================

create table if not exists follow_ups (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references contacts(id) on delete cascade,
  due_on       date,                                  -- what it was scheduled for
  completed_on date not null default current_date,    -- when it was marked done
  note         text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create index if not exists follow_ups_contact on follow_ups (contact_id, completed_on desc);

alter table follow_ups enable row level security;

drop policy if exists follow_ups_authenticated on follow_ups;
create policy follow_ups_authenticated on follow_ups
  for all to authenticated using (true) with check (true);
