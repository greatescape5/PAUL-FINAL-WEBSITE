import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mask an email for display: j***@gmail.com
function mask(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return 'your address';
  const head = user.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(1, user.length - 1))}@${domain}`;
}

// GET: look up the subscriber for a token (to show which address is unsubscribing).
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!UUID_RE.test(token)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  const db = admin();
  if (!db) return NextResponse.json({ error: 'Unavailable' }, { status: 500 });
  const { data } = await db.from('subscribers').select('email,status').eq('unsub_token', token).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ email: mask(data.email), status: data.status });
}

// POST: actually unsubscribe. (A GET link wouldn't be safe — mail clients prefetch.)
export async function POST(req: Request) {
  let token = '';
  try { token = (await req.json())?.token || ''; } catch { /* ignore */ }
  if (!UUID_RE.test(token)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  const db = admin();
  if (!db) return NextResponse.json({ error: 'Unavailable' }, { status: 500 });
  const { error } = await db.from('subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('unsub_token', token);
  if (error) return NextResponse.json({ error: 'Could not unsubscribe' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
