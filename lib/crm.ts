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
  item_type: 'rate_change' | 'follow_up' | 'stale_lead' | 'check_in'
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

// ---- Pricing tiers (editable name + price; see migration 0003) ----
export interface Tier {
  id: string
  name: string
  price: number
  sort_order: number
}

export async function getTiers() {
  const { data, error } = await supabase
    .from('tiers').select('id,name,price,sort_order')
    .is('archived_at', null)
    .order('sort_order')
  if (error) throw error
  return data as Tier[]
}

export async function createTier(name: string, price: number, sortOrder: number) {
  const { error } = await supabase.from('tiers').insert({ name, price, sort_order: sortOrder })
  if (error) throw error
}

export async function updateTier(id: string, patch: Partial<Pick<Tier, 'name' | 'price' | 'sort_order'>>) {
  const { error } = await supabase.from('tiers').update(patch).eq('id', id)
  if (error) throw error
}

export async function archiveTier(id: string) {
  const { error } = await supabase.from('tiers').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ---- Expenses (see migration 0004) ----
export type Recurrence = 'one_time' | 'monthly'

export interface Expense {
  id: string
  name: string
  amount: number
  incurred_on: string
  recurrence: Recurrence
}

export async function getExpenses() {
  const { data, error } = await supabase
    .from('expenses').select('id,name,amount,incurred_on,recurrence')
    .is('archived_at', null)
    .order('incurred_on', { ascending: false })
  if (error) throw error
  return data as Expense[]
}

export async function createExpense(input: {
  name: string; amount: number; incurred_on: string; recurrence: Recurrence
}) {
  const { error } = await supabase.from('expenses').insert(input)
  if (error) throw error
}

export async function updateExpense(id: string, patch: Partial<{
  name: string; amount: number; incurred_on: string; recurrence: Recurrence
}>) {
  const { error } = await supabase.from('expenses').update(patch).eq('id', id)
  if (error) throw error
}

export async function archiveExpense(id: string) {
  const { error } = await supabase.from('expenses').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// Billing history for the P&L revenue reconstruction. Each priced contact is a
// subscription active from started_on until cancelled_on (or ongoing). Current
// MRR still comes from v_mrr (which excludes paused); this drives the trend.
export interface BillingContact {
  id: string
  full_name: string
  monthly_rate: number
  started_on: string | null
  cancelled_on: string | null
  lifecycle: Lifecycle
}

// ---- Accountability check-ins (see migration 0005) ----
export interface CheckIn {
  id: string
  contact_id: string
  kind: string
  done_on: string
  note: string | null
  post_note: string | null
  completed_at: string | null
  created_at: string
}

/** Labels for a check-in's two note moments, tuned for face-call check-ins. */
export function checkInNoteLabels(kind: string) {
  return /face call/i.test(kind)
    ? { pre: 'Pre-meeting notes', post: 'Post-meeting notes' }
    : { pre: 'Notes', post: 'Outcome' }
}

export async function getCheckIns(contactId: string) {
  const { data, error } = await supabase
    .from('check_ins').select('*')
    .eq('contact_id', contactId)
    .order('done_on', { ascending: false })
  if (error) throw error
  return data as CheckIn[]
}

export async function addCheckIn(contactId: string, kind: string, doneOn: string, note?: string) {
  const { error } = await supabase.from('check_ins').insert({
    contact_id: contactId, kind, done_on: doneOn, note: note || null,
  })
  if (error) throw error
}

export async function deleteCheckIn(id: string) {
  const { error } = await supabase.from('check_ins').delete().eq('id', id)
  if (error) throw error
}

/**
 * Marks a scheduled check-in done so it drops off Today. Optionally records a
 * note about how it went and schedules the next check-in (same kind) in one step.
 */
export async function completeCheckIn(
  id: string,
  opts?: { note?: string; nextDate?: string | null },
) {
  const { data: row, error: readErr } = await supabase
    .from('check_ins').select('contact_id,kind').eq('id', id).single()
  if (readErr) throw readErr

  const postNote = opts?.note?.trim() || null

  const { error } = await supabase
    .from('check_ins')
    .update({ completed_at: new Date().toISOString(), post_note: postNote })
    .eq('id', id)
  if (error) throw error

  if (opts?.nextDate) {
    const { error: insErr } = await supabase.from('check_ins').insert({
      contact_id: row.contact_id, kind: row.kind, done_on: opts.nextDate, note: null,
    })
    if (insErr) throw insErr
  }
}

// ---- Completed follow-up log (see migration 0006) ----
export interface FollowUp {
  id: string
  contact_id: string
  due_on: string | null
  completed_on: string
  note: string | null
  created_at: string
}

export async function getFollowUps(contactId: string) {
  const { data, error } = await supabase
    .from('follow_ups').select('*')
    .eq('contact_id', contactId)
    .order('completed_on', { ascending: false })
  if (error) throw error
  return data as FollowUp[]
}

/** Marks the pending follow-up done: logs it, then sets contacts.follow_up_on
 *  to the next date (or clears it). Works from Today or the contact page. */
export async function completeFollowUp(
  contactId: string,
  dueOn: string | null,
  opts: { note?: string; nextDate?: string | null } = {},
) {
  const { error: e1 } = await supabase
    .from('follow_ups')
    .insert({ contact_id: contactId, due_on: dueOn, note: opts.note || null })
  if (e1) throw e1
  const { error: e2 } = await supabase
    .from('contacts').update({ follow_up_on: opts.nextDate ?? null }).eq('id', contactId)
  if (e2) throw e2
}

// ---- Newsletter subscribers (see migration 0009) ----
export interface Subscriber {
  id: string
  email: string
  name: string | null
  source: string
  status: 'subscribed' | 'unsubscribed'
  source_detail: Record<string, unknown> | null
  created_at: string
  unsubscribed_at: string | null
}

export interface Broadcast {
  id: string
  subject: string
  body_html: string
  sent_count: number
  sent_at: string
}

export async function getBroadcasts() {
  const { data, error } = await supabase
    .from('newsletter_broadcasts').select('id,subject,body_html,sent_count,sent_at')
    .order('sent_at', { ascending: false })
  if (error) throw error
  return data as Broadcast[]
}

/** Uploads an image to the public `newsletter` bucket, returns its public URL. */
export async function uploadNewsletterImage(file: File) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('newsletter').upload(path, file, {
    cacheControl: '31536000', contentType: file.type || undefined, upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('newsletter').getPublicUrl(path)
  return data.publicUrl
}

/** Sends the composed newsletter to all subscribed contacts (via the server). */
export async function sendNewsletter(subject: string, html: string): Promise<{ sent: number }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Your session expired — sign in again.')
  const res = await fetch('/api/newsletter/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ subject, html }),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out?.error || 'Send failed')
  return { sent: out.sent ?? 0 }
}

export async function getSubscribers() {
  const { data, error } = await supabase
    .from('subscribers').select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Subscriber[]
}

export async function setSubscriberStatus(id: string, status: 'subscribed' | 'unsubscribed') {
  const { error } = await supabase.from('subscribers').update({
    status,
    unsubscribed_at: status === 'unsubscribed' ? new Date().toISOString() : null,
  }).eq('id', id)
  if (error) throw error
}

export async function deleteSubscriber(id: string) {
  const { error } = await supabase.from('subscribers').delete().eq('id', id)
  if (error) throw error
}

export async function getBillingContacts() {
  const { data, error } = await supabase
    .from('v_contacts')
    .select('id,full_name,monthly_rate,started_on,cancelled_on,lifecycle')
    .not('monthly_rate', 'is', null)
    .gt('monthly_rate', 0)
  if (error) throw error
  return data as BillingContact[]
}
