-- ============================================================================
-- Flow Motion PT — CRM
-- 0003: pricing tiers
-- ============================================================================
--
-- Paul's editable pricing structure. Tier = a name + a monthly price he can
-- rename/re-price/reorder from Settings. Seeded with the distinct price points
-- from the legacy "Price Tier Breakdown" so the table mirrors reality on day
-- one; he renames/archives from there.
--
-- Like stages, tiers are DATA (not an enum) and are never hard-deleted —
-- archived_at only — so re-pricing history stays intact.
-- ============================================================================

create table if not exists tiers (
  id          uuid primary key default gen_random_uuid(),
  name        text          not null,
  price       numeric(8,2)  not null default 0 check (price >= 0),
  sort_order  int           not null default 0,
  archived_at timestamptz,
  created_at  timestamptz   not null default now()
);

create index if not exists tiers_active on tiers (sort_order) where archived_at is null;

alter table tiers enable row level security;

drop policy if exists tiers_authenticated on tiers;
create policy tiers_authenticated on tiers
  for all to authenticated using (true) with check (true);

-- Seed from the legacy price points (rename in Settings).
insert into tiers (name, price, sort_order) values
  ('$349', 349, 10),
  ('$299', 299, 20),
  ('$245', 245, 30),
  ('$210', 210, 40),
  ('$200', 200, 50),
  ('$150', 150, 60),
  ('$99',  99,  70),
  ('$50',  50,  80)
on conflict do nothing;
