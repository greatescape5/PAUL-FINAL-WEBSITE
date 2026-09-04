-- ============================================================================
-- Flow Motion PT — CRM functions and views
-- 0002: state transitions, undo, merge, rate changes, dashboard views
-- ============================================================================
--
-- The governing rule for this file:
--
--   EVERY WRITE IS REVERSIBLE AND EVERY WRITE LOGS ITSELF.
--
-- Paul enters data one-handed on a phone between training sessions. He will
-- tap the wrong row. He will mark someone cancelled who is actually paused.
-- The system's job is to make that a two-second correction, not a data
-- recovery exercise. So:
--
--   * No transition ever clears data. Cancelling keeps the rate. Un-cancelling
--     restores it. A misfire costs nothing.
--   * Every transition writes an activity row carrying its own "from" value,
--     which is what makes undo_last_change() possible without a separate
--     versioning system.
--   * Nothing cascades. Changing lifecycle does not touch stage, rate, or
--     follow-ups beyond the specific dates that define the state.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- set_lifecycle — THE primary action in this app.
--
-- Handles lead → client → paused → past_client and every reverse edge.
-- Idempotent: setting the current value is a no-op that logs nothing.
-- ---------------------------------------------------------------------------
create or replace function set_lifecycle(
  p_contact         uuid,
  p_lifecycle       text,
  p_note            text default null,
  p_effective       date default current_date,
  p_expected_return date default null      -- only meaningful for 'paused'
) returns contacts
language plpgsql security definer set search_path = public as $$
declare
  v_old contacts;
  v_new contacts;
begin
  select * into v_old from contacts where id = p_contact;
  if not found then
    raise exception 'contact % not found', p_contact;
  end if;

  if v_old.lifecycle = p_lifecycle then
    return v_old;                       -- no-op, no noise in the timeline
  end if;

  update contacts set
    lifecycle = p_lifecycle,

    -- Dates are set on entry to a state and CLEARED on exit, so that
    -- un-cancelling someone does not leave a stale cancelled_on behind.
    started_on = case
                   when p_lifecycle = 'client' and started_on is null
                     then p_effective
                   else started_on
                 end,

    converted_at = case
                     when p_lifecycle = 'client' and converted_at is null
                       then now()
                     else converted_at
                   end,

    paused_on = case when p_lifecycle = 'paused' then p_effective else null end,

    expected_return = case
                        when p_lifecycle = 'paused' then p_expected_return
                        else null
                      end,

    cancelled_on = case
                     when p_lifecycle = 'past_client' then p_effective
                     else null
                   end,

    -- Pausing schedules its own check-in. This is the retention mechanic:
    -- the legacy sheet lost several injured clients simply because nobody
    -- followed up when they were ready to come back.
    follow_up_on = case
                     when p_lifecycle = 'paused' and p_expected_return is not null
                       then p_expected_return
                     else follow_up_on
                   end
  where id = p_contact
  returning * into v_new;

  insert into activities (contact_id, kind, body, meta, created_by)
  values (
    p_contact,
    'lifecycle_change',
    p_note,
    jsonb_build_object(
      'from', v_old.lifecycle,
      'to',   p_lifecycle,
      'from_started_on',      v_old.started_on,
      'from_paused_on',       v_old.paused_on,
      'from_expected_return', v_old.expected_return,
      'from_cancelled_on',    v_old.cancelled_on,
      'from_follow_up_on',    v_old.follow_up_on
    ),
    auth.uid()
  );

  return v_new;
end $$;


-- ---------------------------------------------------------------------------
-- set_stage — same contract, for pipeline position.
-- ---------------------------------------------------------------------------
create or replace function set_stage(
  p_contact uuid,
  p_stage   uuid,
  p_note    text default null
) returns contacts
language plpgsql security definer set search_path = public as $$
declare
  v_old contacts;
  v_new contacts;
begin
  select * into v_old from contacts where id = p_contact;
  if not found then
    raise exception 'contact % not found', p_contact;
  end if;

  if v_old.stage_id is not distinct from p_stage then
    return v_old;
  end if;

  update contacts set stage_id = p_stage
  where id = p_contact returning * into v_new;

  insert into activities (contact_id, kind, body, meta, created_by)
  values (p_contact, 'stage_change', p_note,
          jsonb_build_object('from', v_old.stage_id, 'to', p_stage),
          auth.uid());

  return v_new;
end $$;


-- ---------------------------------------------------------------------------
-- undo_last_change — reverses the most recent lifecycle, stage, or rate
-- change on a contact using the "from" values stored in the activity.
--
-- This is what makes mis-taps free. The UI shows an Undo affordance on the
-- contact detail screen for the last reversible action.
--
-- The original activity is marked undone rather than deleted, and the undo
-- itself is logged. The timeline stays truthful about what happened.
-- ---------------------------------------------------------------------------
create or replace function undo_last_change(p_contact uuid)
returns contacts
language plpgsql security definer set search_path = public as $$
declare
  a     activities;
  v_new contacts;
begin
  select * into a
  from activities
  where contact_id = p_contact
    and undone_at is null
    and kind in ('lifecycle_change','stage_change','rate_change')
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'nothing to undo for contact %', p_contact;
  end if;

  if a.kind = 'lifecycle_change' then
    update contacts set
      lifecycle       = a.meta->>'from',
      started_on      = nullif(a.meta->>'from_started_on','')::date,
      paused_on       = nullif(a.meta->>'from_paused_on','')::date,
      expected_return = nullif(a.meta->>'from_expected_return','')::date,
      cancelled_on    = nullif(a.meta->>'from_cancelled_on','')::date,
      follow_up_on    = nullif(a.meta->>'from_follow_up_on','')::date
    where id = p_contact returning * into v_new;

  elsif a.kind = 'stage_change' then
    update contacts set stage_id = nullif(a.meta->>'from','')::uuid
    where id = p_contact returning * into v_new;

  elsif a.kind = 'rate_change' then
    update contacts set monthly_rate = nullif(a.meta->>'from','')::numeric
    where id = p_contact returning * into v_new;

    -- put the scheduled change back into the pending queue
    update rate_changes set applied_at = null
    where id = nullif(a.meta->>'rate_change_id','')::uuid;
  end if;

  update activities set undone_at = now() where id = a.id;

  insert into activities (contact_id, kind, body, meta, created_by)
  values (p_contact, 'system', 'Reverted previous change',
          jsonb_build_object('undid_activity', a.id, 'undid_kind', a.kind),
          auth.uid());

  return v_new;
end $$;


-- ---------------------------------------------------------------------------
-- schedule_rate_change / apply_rate_change
--
-- Scheduling is free and reversible. Applying is a deliberate confirmation
-- that Stripe has actually been updated — this system cannot bill anyone,
-- so pretending it applied a change automatically would create exactly the
-- silent drift the spreadsheet already suffers from.
-- ---------------------------------------------------------------------------
create or replace function schedule_rate_change(
  p_contact   uuid,
  p_to_rate   numeric,
  p_effective date,
  p_reason    text default null
) returns rate_changes
language plpgsql security definer set search_path = public as $$
declare
  v_current numeric;
  v_row     rate_changes;
begin
  select monthly_rate into v_current from contacts where id = p_contact;
  if not found then
    raise exception 'contact % not found', p_contact;
  end if;

  insert into rate_changes (contact_id, from_rate, to_rate, effective_on,
                            reason, created_by)
  values (p_contact, v_current, p_to_rate, p_effective, p_reason, auth.uid())
  returning * into v_row;

  return v_row;
end $$;


create or replace function apply_rate_change(p_rate_change uuid)
returns contacts
language plpgsql security definer set search_path = public as $$
declare
  rc    rate_changes;
  v_old numeric;
  v_new contacts;
begin
  select * into rc from rate_changes where id = p_rate_change;
  if not found then
    raise exception 'rate change % not found', p_rate_change;
  end if;
  if rc.applied_at is not null then
    raise exception 'rate change % already applied', p_rate_change;
  end if;
  if rc.cancelled_at is not null then
    raise exception 'rate change % was cancelled', p_rate_change;
  end if;

  select monthly_rate into v_old from contacts where id = rc.contact_id;

  update rate_changes set applied_at = now() where id = p_rate_change;

  update contacts set monthly_rate = rc.to_rate
  where id = rc.contact_id returning * into v_new;

  insert into activities (contact_id, kind, body, meta, created_by)
  values (rc.contact_id, 'rate_change',
          rc.reason,
          jsonb_build_object('from', v_old, 'to', rc.to_rate,
                             'rate_change_id', rc.id),
          auth.uid());

  return v_new;
end $$;


-- ---------------------------------------------------------------------------
-- merge_contacts / unmerge_contacts
--
-- The legacy data has Pat Hayden, Maria Koston and Monica Thomas each
-- existing as two rows. Paul will also occasionally re-enter someone he
-- already has. Merging must be a one-tap action he is not afraid of, so it
-- snapshots the losing row in full and can be reversed.
--
-- The loser is never deleted. merged_into points at the survivor, which
-- keeps every foreign key and old link intact.
-- ---------------------------------------------------------------------------
create or replace function merge_contacts(p_keep uuid, p_merge uuid)
returns contacts
language plpgsql security definer set search_path = public as $$
declare
  v_loser  contacts;
  v_keeper contacts;
begin
  if p_keep = p_merge then
    raise exception 'cannot merge a contact into itself';
  end if;

  select * into v_loser  from contacts where id = p_merge;
  if not found then raise exception 'contact % not found', p_merge; end if;
  select * into v_keeper from contacts where id = p_keep;
  if not found then raise exception 'contact % not found', p_keep; end if;

  insert into contact_merges (kept_id, merged_id, snapshot, created_by)
  values (p_keep, p_merge, to_jsonb(v_loser), auth.uid());

  -- Move history and scheduled changes onto the survivor.
  update activities   set contact_id = p_keep where contact_id = p_merge;
  update rate_changes set contact_id = p_keep where contact_id = p_merge;
  update subscribers  set contact_id = p_keep where contact_id = p_merge;

  -- Fill only the blanks on the keeper. Never overwrite a value Paul
  -- has already confirmed.
  update contacts set
    email          = coalesce(email,          v_loser.email),
    phone          = coalesce(phone,          v_loser.phone),
    monthly_rate   = coalesce(monthly_rate,   v_loser.monthly_rate),
    started_on     = least(coalesce(started_on, v_loser.started_on),
                           coalesce(v_loser.started_on, started_on)),
    ptd_client_ref = coalesce(ptd_client_ref, v_loser.ptd_client_ref),
    interest       = coalesce(interest,       v_loser.interest),
    follow_up_on   = coalesce(follow_up_on,   v_loser.follow_up_on)
  where id = p_keep
  returning * into v_keeper;

  update contacts set merged_into = p_keep, archived_at = now()
  where id = p_merge;

  insert into activities (contact_id, kind, body, meta, created_by)
  values (p_keep, 'merge',
          format('Merged duplicate record for %s', v_loser.full_name),
          jsonb_build_object('merged_contact_id', p_merge), auth.uid());

  return v_keeper;
end $$;


create or replace function unmerge_contacts(p_merge_id uuid)
returns contacts
language plpgsql security definer set search_path = public as $$
declare
  m       contact_merges;
  v_loser contacts;
begin
  select * into m from contact_merges
  where id = p_merge_id and reversed_at is null;
  if not found then
    raise exception 'merge % not found or already reversed', p_merge_id;
  end if;

  update contacts set merged_into = null, archived_at = null
  where id = m.merged_id returning * into v_loser;

  -- Activities that predate the merge go home with the restored record.
  update activities set contact_id = m.merged_id
  where contact_id = m.kept_id and created_at < m.created_at
    and contact_id is distinct from m.merged_id
    and id in (
      select id from activities
      where contact_id = m.kept_id and created_at < m.created_at
    );

  update contact_merges set reversed_at = now() where id = p_merge_id;

  insert into activities (contact_id, kind, body, meta, created_by)
  values (m.kept_id, 'unmerge', 'Merge reversed',
          jsonb_build_object('restored_contact_id', m.merged_id), auth.uid());

  return v_loser;
end $$;


-- ---------------------------------------------------------------------------
-- VIEWS
-- ---------------------------------------------------------------------------

-- Every contact excluding archived and merged-away rows. Query this, not
-- the base table, everywhere in the app.
create or replace view v_contacts as
select c.*, s.name as stage_name, s.color as stage_color, s.sort_order as stage_order
from contacts c
left join stages s on s.id = c.stage_id
where c.archived_at is null and c.merged_into is null;


-- Live MRR. Already more trustworthy than the hand-maintained tier table in
-- the spreadsheet, which was stale by roughly $350/month at import time.
create or replace view v_mrr as
select
  count(*) filter (where lifecycle = 'client')                      as active_clients,
  count(*) filter (where lifecycle = 'paused')                      as paused_clients,
  coalesce(sum(monthly_rate) filter (where lifecycle = 'client'), 0) as mrr,
  round(coalesce(avg(monthly_rate) filter (where lifecycle = 'client'), 0), 2)
                                                                     as avg_rate,
  coalesce(sum(monthly_rate) filter (where lifecycle = 'paused'), 0) as paused_mrr
from v_contacts;


-- THE HOME SCREEN. One query, already ordered by urgency.
--
-- Ordering is deliberate: money first, then commitments, then leads going
-- cold. Overdue rate changes sit at the top because they are the only item
-- here that costs him cash every day it is ignored.
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

  -- Leads that arrived and were never touched. 48h is the window where a
  -- fitness enquiry is still warm.
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

-- Consumers sort by priority, then days_overdue desc.


-- Rows the import could not resolve on its own. Drives a dismissible banner
-- so bad data is visible and fixable rather than silently wrong.
create or replace view v_needs_review as
select id, full_name, email, phone, lifecycle, monthly_rate, needs_review,
       created_at
from v_contacts
where needs_review is not null
order by created_at;


-- Possible duplicates, surfaced so the merge button has something to point at.
create or replace view v_possible_duplicates as
select a.id as contact_a, a.full_name as name_a,
       b.id as contact_b, b.full_name as name_b,
       case when a.email is not null and a.email = b.email then 'email'
            when a.phone is not null and a.phone = b.phone then 'phone'
            else 'name' end as matched_on
from v_contacts a
join v_contacts b
  on a.id < b.id
 and (   (a.email is not null and a.email = b.email)
      or (a.phone is not null and a.phone = b.phone)
      or lower(trim(a.full_name)) = lower(trim(b.full_name)) );
