import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { welcomeEmail } from '@/lib/emails';
import { absoluteUrl } from '@/lib/site';

export const runtime = 'nodejs';

async function sendWelcome(email: string, token: string | null) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  if (!resendKey || !fromEmail || !token) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    const mail = welcomeEmail({ unsubscribeUrl: absoluteUrl(`/unsubscribe?token=${token}`) });
    await resend.emails.send({ from: fromEmail, to: email, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (err) {
    console.error('Welcome email failed:', err);
  }
}

// ---- Basic per-IP rate limit (in-memory, per serverless instance) ----
const hits = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  email?: string;
  name?: string;
  source?: string;       // 'popup' | 'footer' | …
  company?: string;      // honeypot — real users never fill this
  utm?: Record<string, string>;
  referrer?: string;
  landing_page?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: silently accept so bots learn nothing, but drop the submission.
  if (body.company && String(body.company).trim()) {
    return NextResponse.json({ ok: true });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests, please try again shortly.' }, { status: 429 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const name = (body.name || '').trim();
  const source = (body.source || 'website').trim().slice(0, 40);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) {
    console.warn('Subscribe received but Supabase service-role env is not set.');
    return NextResponse.json({ ok: true });
  }

  const sourceDetail: Record<string, unknown> = {
    ...(body.utm && typeof body.utm === 'object' ? body.utm : {}),
    ...(body.referrer ? { referrer: body.referrer } : {}),
    ...(body.landing_page ? { landing_page: body.landing_page } : {}),
  };

  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Idempotent on email: if they already exist, re-activate; otherwise insert.
    const { data: existing } = await admin
      .from('subscribers').select('id,status,unsub_token').ilike('email', email).maybeSingle();

    if (existing) {
      await admin.from('subscribers').update({
        status: 'subscribed',
        unsubscribed_at: null,
        ...(name ? { name } : {}),
      }).eq('id', existing.id);
      // Only re-welcome someone who had actually left the list.
      if (existing.status === 'unsubscribed') {
        await sendWelcome(email, existing.unsub_token ?? null);
      }
    } else {
      const { data: inserted, error } = await admin.from('subscribers').insert({
        email,
        name: name || null,
        source,
        source_detail: sourceDetail,
      }).select('unsub_token').single();
      if (error) {
        // Unique-index race → treat as success (they're on the list either way).
        if (!String(error.message).toLowerCase().includes('duplicate')) {
          console.error('Subscriber insert failed:', error.message);
          return NextResponse.json({ error: 'Could not subscribe. Please try again.' }, { status: 500 });
        }
      } else {
        await sendWelcome(email, inserted?.unsub_token ?? null);
      }
    }
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'Could not subscribe. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
