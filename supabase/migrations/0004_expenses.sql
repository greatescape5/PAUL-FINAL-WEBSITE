-- ============================================================================
-- Flow Motion PT — CRM
-- 0004: expenses
-- ============================================================================
--
-- Simple business expense tracker. Each expense is a name + amount + date,
-- flagged one-time or monthly-recurring. Recurring rows contribute to every
-- month from their date onward (there is no end date; archive to stop it).
--
-- Like everything else here: RLS authenticated-only, archived_at (no hard
-- delete) so a removed expense can come back.
-- ============================================================================

create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  name        text          not null,
  amount      numeric(10,2) not null check (amount >= 0),
  incurred_on date          not null default current_date,
  recurrence  text          not null default 'one_time'
              check (recurrence in ('one_time','monthly')),
  archived_at timestamptz,
  created_at  timestamptz   not null default now()
);

create index if not exists expenses_active
  on expenses (incurred_on) where archived_at is null;

alter table expenses enable row level security;

drop policy if exists expenses_authenticated on expenses;
create policy expenses_authenticated on expenses
  for all to authenticated using (true) with check (true);
