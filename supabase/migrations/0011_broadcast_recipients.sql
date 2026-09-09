-- ============================================================================
-- Flow Motion PT — CRM
-- 0011: remember who each newsletter went to
-- ============================================================================
--
-- The History view shows, per sent newsletter, the exact list of addresses it
-- was delivered to. We snapshot the recipient emails on the broadcast row at
-- send time (rather than re-deriving from the current subscriber list, which
-- drifts as people join/leave).
-- ============================================================================

alter table newsletter_broadcasts
  add column if not exists recipients jsonb not null default '[]'::jsonb;
