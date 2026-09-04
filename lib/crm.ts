// ============================================================================
// Flow Motion PT — CRM types and data access
// ============================================================================
// Every mutation goes through an RPC defined in 0002_crm_functions.sql.
// Do NOT write to `contacts` directly with .update() — the RPCs are what
// write the audit trail that makes undo work. A direct update is a silent
// change with no timeline entry and no way back.
// ============================================================================

import { createClient } from '@supabase/supabase-js'

export type Lifecycle = 'lead' | 'client' | 'paused' | 'past_client'
export type PaymentMethod = 'stripe' | 'venmo' | 'cash' | 'other'

export type ActivityKind =
  | 'note' | 'lifecycle_change' | 'stage_change' | 'rate_change'
  | 'form_submission' | 'merge' | 'unmerge' | 'system'

export interface Stage {
  id: string
  name: string
  sort_order: number
  color: string
  is_default: boolean
  is_terminal: boolean
}

export interface Contact {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  lifecycle: Lifecycle
  stage_id: string | null
  stage_name: string | null
  stage_color: string | null
  monthly_rate: number | null
  payment_method: PaymentMethod
  interest: string | null
  source: string | null
  source_detail: Record<string, unknown>
  follow_up_on: string | null
  started_on: string | null
  paused_on: string | null
  expected_return: string | null
  cancelled_on: string | null
  ptd_client_ref: string | null
  converted_at: string | null
  needs_review: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  contact_id: string
  kind: ActivityKind
  body: string | null
  meta: Record<string, unknown>
  undone_at: string | null
  created_at: string
}

export interface RateChange {
  id: string
  contact_id: string
  from_rate: number | null
  to_rate: number
  effective_on: string
  applied_at: string | null
  cancelled_at: string | null
  reason: string | null
}

export interface TodayItem {
  item_type: 'rate_change' | 'follow_up' | 'stale_lead'
  item_id: string
  contact_id: string
  full_name: string
  lifecycle: Lifecycle
  due_on: string
  days_overdue: number
  label: string
  priority: number
}

// ---------------------------------------------------------------------------
// Human-facing labels. Paul does not think in schema words.
// ---------------------------------------------------------------------------
export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  lead: 'Lead',
  client: 'Active client',
  paused: 'Paused',
  past_client: 'Past client',
}

export const LIFECYCLE_COLOR: Record<Lifecycle, string> = {
  lead: '#3b82f6',
  client: '#10b981',
  paused: '#f59e0b',
  past_client: '#94a3b8',
}

export const LIFECYCLE_ORDER: Lifecycle[] =
  ['lead', 'client', 'paused', 'past_client']

// Placeholder fallbacks keep the build from crashing with "supabaseUrl is
// required" when env vars aren't set yet (e.g. a preview deploy before the
// keys are added). With no real keys, auth simply finds no session.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
)

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * The single most-used action in the app. Any lifecycle to any other
 * lifecycle, including backwards. Nothing is destroyed by a wrong call —
 * `undoLastChange` reverses it completely.
 *
 * `expectedReturn` is only meaningful for 'paused', where it also sets the
 * follow-up date so a paused client cannot be forgotten.
 */
export async function setLifecycle(
  contactId: string,
  lifecycle: Lifecycle,
  opts: { note?: string; effective?: string; expectedReturn?: string } = {},
) {
  const { data, error } = await supabase.rpc('set_lifecycle', {
    p_contact: contactId,
    p_lifecycle: lifecycle,
    p_note: opts.note ?? null,
    p_effective: opts.effective ?? new Date().toISOString().slice(0, 10),
    p_expected_return: opts.expectedReturn ?? null,
  })
  if (error) throw error
  return data as Contact
}

export async function setStage(contactId: string, stageId: string, note?: string) {
  const { data, error } = await supabase.rpc('set_stage', {
    p_contact: contactId, p_stage: stageId, p_note: note ?? null,
  })
  if (error) throw error
  return data as Contact
}

/** Reverses the most recent lifecycle / stage / rate change on a contact. */
export async function undoLastChange(contactId: string) {
  const { data, error } = await supabase.rpc('undo_last_change', {
    p_contact: contactId,
  })
  if (error) throw error
  return data as Contact
}

export async function scheduleRateChange(
  contactId: string, toRate: number, effectiveOn: string, reason?: string,
) {
  const { data, error } = await supabase.rpc('schedule_rate_change', {
    p_contact: contactId, p_to_rate: toRate,
    p_effective: effectiveOn, p_reason: reason ?? null,
  })
  if (error) throw error
  return data as RateChange
}

/** Confirms the change has been made in Stripe. Only call from a deliberate tap. */
export async function applyRateChange(rateChangeId: string) {
  const { data, error } = await supabase.rpc('apply_rate_change', {
    p_rate_change: rateChangeId,
  })
  if (error) throw error
  return data as Contact
}

export async function mergeContacts(keepId: string, mergeId: string) {
  const { data, error } = await supabase.rpc('merge_contacts', {
    p_keep: keepId, p_merge: mergeId,
  })
  if (error) throw error
  return data as Contact
}

/** Manual contact entry — met at the gym, a referral, a DM. Starts fresh, so
 *  a direct insert is fine (there's no prior state to audit). */
export async function createContact(input: {
  full_name: string
  email?: string | null
  phone?: string | null
  lifecycle?: Lifecycle
  stage_id?: string | null
  monthly_rate?: number | null
  interest?: string | null
  source?: string
}) {
  const { data, error } = await supabase
    .from('contacts')
    .insert({ source: 'manual', ...input })
    .select('id')
    .single()
  if (error) throw error
  return data as { id: string }
}

export async function addNote(contactId: string, body: string) {
  const { error } = await supabase
    .from('activities')
    .insert({ contact_id: contactId, kind: 'note', body })
  if (error) throw error
}

export async function setFollowUp(contactId: string, date: string | null) {
  const { error } = await supabase
    .from('contacts').update({ follow_up_on: date }).eq('id', contactId)
  if (error) throw error
}

/** Clears the import banner once Paul has confirmed the row is correct. */
export async function clearReview(contactId: string) {
  const { error } = await supabase
    .from('contacts').update({ needs_review: null }).eq('id', contactId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Queries — always against v_contacts, never the base table
// ---------------------------------------------------------------------------

export async function getToday(): Promise<TodayItem[]> {
  const { data, error } = await supabase
    .from('v_today').select('*')
    .order('priority').order('days_overdue', { ascending: false })
  if (error) throw error
  return data as TodayItem[]
}

export async function getContacts(lifecycle?: Lifecycle) {
  let q = supabase.from('v_contacts').select('*').order('full_name')
  if (lifecycle) q = q.eq('lifecycle', lifecycle)
  const { data, error } = await q
  if (error) throw error
  return data as Contact[]
}

export async function getContact(id: string) {
  const [contact, activities, rates] = await Promise.all([
    supabase.from('v_contacts').select('*').eq('id', id).single(),
    supabase.from('activities').select('*')
      .eq('contact_id', id).order('created_at', { ascending: false }),
    supabase.from('rate_changes').select('*')
      .eq('contact_id', id).order('effective_on', { ascending: false }),
  ])
  if (contact.error) throw contact.error
  return {
    contact: contact.data as Contact,
    activities: (activities.data ?? []) as Activity[],
    rateChanges: (rates.data ?? []) as RateChange[],
  }
}

export async function getMrr() {
  const { data, error } = await supabase.from('v_mrr').select('*').single()
  if (error) throw error
  return data as {
    active_clients: number; paused_clients: number
    mrr: number; avg_rate: number; paused_mrr: number
  }
}

/** Active pipeline stages, in order. */
export async function getStages() {
  const { data, error } = await supabase
    .from('stages').select('*')
    .is('archived_at', null)
    .order('sort_order')
  if (error) throw error
  return data as Stage[]
}

export async function getContactLite(id: string) {
  const { data, error } = await supabase
    .from('v_contacts').select('*').eq('id', id).single()
  if (error) throw error
  return data as Contact
}

export interface PossibleDuplicate {
  contact_a: string
  name_a: string
  contact_b: string
  name_b: string
  matched_on: 'email' | 'phone' | 'name'
}

export async function getPossibleDuplicates() {
  const { data, error } = await supabase.from('v_possible_duplicates').select('*')
  if (error) throw error
  return data as PossibleDuplicate[]
}

// Stages are editable data (not audited), so these write the table directly.
export async function createStage(name: string, sortOrder: number) {
  const { error } = await supabase.from('stages').insert({ name, sort_order: sortOrder })
  if (error) throw error
}

export async function updateStage(id: string, patch: Partial<Pick<Stage, 'name' | 'color' | 'sort_order'>>) {
  const { error } = await supabase.from('stages').update(patch).eq('id', id)
  if (error) throw error
}

export async function archiveStage(id: string) {
  const { error } = await supabase.from('stages').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
