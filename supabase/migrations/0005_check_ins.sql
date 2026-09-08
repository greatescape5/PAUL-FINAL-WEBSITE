-- ============================================================================
-- Flow Motion PT — CRM
-- 0005: accountability check-ins
-- ============================================================================
--
-- A dated accountability log per contact. In the legacy spreadsheet this was a
-- wall of columns ("Thank you", "Face call check-in", …) with a date in each
-- cell; here each check-in is a row: a type + the date it happened.
-- ============================================================================

create table if not exists check_ins (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references contacts(id) on delete cascade,
  kind        text not null,                         -- "Face call check-in", "Thank you", …
  done_on     date not null default current_date,
  note        text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create index if not exists check_ins_contact on check_ins (contact_id, done_on desc);

alter table check_ins enable row level security;

drop policy if exists check_ins_authenticated on check_ins;
create policy check_ins_authenticated on check_ins
  for all to authenticated using (true) with check (true);
