-- ============================================================================
-- Flow Motion PT — CRM
-- 0007: scheduled check-ins surface on Today
-- ============================================================================
--
-- A check-in now doubles as a scheduled task: give it a date, and when that
-- date arrives (done_on <= today) it appears on Today until it's marked done
-- (completed_at set). Existing check-ins are treated as already-done history
-- so they don't flood Today.
-- ============================================================================

alter table check_ins add column if not exists completed_at timestamptz;

-- Existing check-ins were logged as things already done → mark them complete.
update check_ins set completed_at = coalesce(completed_at, created_at)
where completed_at is null;

-- ---------------------------------------------------------------------------
-- Rebuild the home screen view to also surface due, not-yet-done check-ins.
-- (Same output columns as before, plus a 'check_in' item type.)
-- ---------------------------------------------------------------------------
create or replace view v_today as
  select
    'rate_change'::text                          as item_type,
    rc.id                                        as item_id,
    c.id                                         as contact_id,
    c.full_name,
    c.lifecycle,
    rc.effective_on                              as due_on,
    (current_date - rc.effective_on)             as days_overdue,
    format('Rate change to $%s was due', rc.to_rate::int) as label,
    1                                            as priority
  from rate_changes rc
  join v_contacts c on c.id = rc.contact_id
  where rc.applied_at is null
    and rc.cancelled_at is null
    and rc.effective_on <= current_date

  union all

  select
    'follow_up', c.id, c.id, c.full_name, c.lifecycle,
    c.follow_up_on,
    (current_date - c.follow_up_on),
    case when c.lifecycle = 'paused'
         then 'Paused client due back'
         else 'Follow-up due' end,
    2
  from v_contacts c
  where c.follow_up_on is not null
    and c.follow_up_on <= current_date

  union all

  -- Scheduled check-ins that have come due and aren't done yet.
  select
    'check_in', ci.id, c.id, c.full_name, c.lifecycle,
    ci.done_on,
    (current_date - ci.done_on),
    ci.kind,
    2
  from check_ins ci
  join v_contacts c on c.id = ci.contact_id
  where ci.completed_at is null
    and ci.done_on <= current_date

  union all

  select
    'stale_lead', c.id, c.id, c.full_name, c.lifecycle,
    c.created_at::date,
    (current_date - c.created_at::date),
    'New lead not yet contacted',
    3
  from v_contacts c
  where c.lifecycle = 'lead'
    and c.created_at < now() - interval '48 hours'
    and c.follow_up_on is null
    and not exists (
      select 1 from activities a
      where a.contact_id = c.id
        and a.kind in ('note','stage_change','lifecycle_change')
    );
