import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { contactInternalEmail, inquiryAutoreplyEmail } from '@/lib/emails';

export const runtime = 'nodejs';

// ---- Basic per-IP rate limit (in-memory, per serverless instance) ----
// Public forms get scraped within a week; this blunts the obvious abuse.
// A durable store (e.g. Upstash) would be sturdier at scale.
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

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  contact_method?: string;
  message?: string;
  company?: string; // honeypot — real users never fill this
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

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const phone = (body.phone || '').trim();
  const contactMethod = (body.contact_method || '').trim();
  const message = (body.message || '').trim();

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // UTMs + referrer + preferred contact go into source_detail (jsonb).
  const sourceDetail: Record<string, unknown> = {
    ...(body.utm && typeof body.utm === 'object' ? body.utm : {}),
    ...(body.referrer ? { referrer: body.referrer } : {}),
    ...(body.landing_page ? { landing_page: body.landing_page } : {}),
    ...(contactMethod ? { preferred_contact: contactMethod } : {}),
  };

  // ---- 1. Create the CRM lead (service role — the public form is anon) ----
  let created = false;
  if (url && serviceKey) {
    try {
      const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

      // Land at the default pipeline stage.
      const { data: stage } = await admin
        .from('stages').select('id')
        .eq('is_default', true).is('archived_at', null).limit(1).maybeSingle();

      const { data: contact, error } = await admin
        .from('contacts')
        .insert({
          full_name: name,
          email: email || null,
          phone: phone || null,
          lifecycle: 'lead',
          source: 'contact_form',
          stage_id: stage?.id ?? null,
          source_detail: sourceDetail,
        })
        .select('id')
        .single();

      if (!error && contact) {
        created = true;
        // Log the submission on the timeline (contacts has no message column
        // by design — the message lives in the activity).
        await admin.from('activities').insert({
          contact_id: contact.id,
          kind: 'form_submission',
          body: message || null,
          meta: { name, email, phone, contact_method: contactMethod, message },
        });
      } else if (error) {
        console.error('Lead insert failed:', error.message);
      }
    } catch (err) {
      console.error('Lead ingest error:', err);
    }
  } else {
    console.warn('Lead received but Supabase service-role env is not set.');
  }

  // ---- 2. Best-effort notifications (owner alert + enquirer auto-reply) ----
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  const toEmail = process.env.OWNER_ALERT_EMAIL;

  if (resendKey && fromEmail && toEmail) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const submittedAt = new Date().toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });

      const internal = contactInternalEmail({ name, email, phone, contactMethod, message, submittedAt });
      await resend.emails.send({ from: fromEmail, to: toEmail, replyTo: email, subject: internal.subject, html: internal.html, text: internal.text });

      const auto = inquiryAutoreplyEmail({ name, message });
      await resend.emails.send({ from: fromEmail, to: email, replyTo: toEmail, subject: auto.subject, html: auto.html, text: auto.text });
    } catch (err) {
      console.error('Lead email failed:', err);
    }
  }

  return NextResponse.json({ ok: true, created });
}
