-- ============================================================================
-- Flow Motion PT — CRM
-- 0018: backfill missing subscriber columns
-- ============================================================================
--
-- The live `subscribers` table was created before `name` and `source_detail`
-- were part of the definition, and `create table if not exists` (migration
-- 0009) never added them to the existing table. Their absence made every
-- insert that includes a name (CSV import) or attribution (site sign-ups)
-- fail. Add them idempotently to match the intended schema.
-- ============================================================================

alter table subscribers add column if not exists name          text;
alter table subscribers add column if not exists source_detail jsonb not null default '{}'::jsonb;
