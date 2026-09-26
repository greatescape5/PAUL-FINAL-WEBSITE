-- ============================================================================
-- Flow Motion PT — CRM
-- 0017: subscriber groups
-- ============================================================================
--
-- Lets subscribers be organized into groups so the client can send targeted
-- newsletters (e.g. website sign-ups vs an imported CSV list). Existing
-- subscribers all came from the site, so they default to the "Website" group;
-- each CSV import lands in its own named group.
-- ============================================================================

alter table subscribers add column if not exists group_name text not null default 'Website';
create index if not exists subscribers_group on subscribers (group_name);
