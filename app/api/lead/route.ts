import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { contactInternalEmail, inquiryAutoreplyEmail } from '@/lib/emails';

export const runtime = 'nodejs';

type LeadBody = {
  name?: string;
  email?: string;
  phone?: string;
  contact_method?: string;
  message?: string;
  company?: string; // honeypot — real users never fill this
};

export async function POST(req: Request) {
  let body: LeadBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: pretend success so bots don't learn anything.
  if (body.company && body.company.trim()) {
    return NextResponse.json({ ok: true, saved: false });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const phone = (body.phone || '').trim();
  const contactMethod = (body.contact_method || '').trim();
  const message = (body.message || '').trim();

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
  }

  // ---- 1. Save the lead to Supabase (graceful if not configured / table not built yet) ----
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Preferred contact method is folded into the stored message until Phase 5
  // formalizes the leads pipeline, so nothing is lost.
  const storedMessage = contactMethod ? `${message}\n\n[Preferred contact: ${contactMethod}]` : message;

  let saved = false;
  try {
    if (url && anonKey) {
      const supabase = createClient(url, anonKey);
      const { error } = await supabase
        .from('leads')
        .insert([{ name, email, phone: phone || null, message: storedMessage, source: 'website' }]);
      if (!error) saved = true;
    }
  } catch {
    // Swallow — we'll still try email, and report below.
  }

  // ---- 2. Best-effort emails via Resend (only if configured) ----
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;         // verified sender on the domain
  const toEmail = process.env.OWNER_ALERT_EMAIL;    // where the owner receives leads

  if (resendKey && toEmail && fromEmail) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);

      const submittedAt = new Date().toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });

      // Notification to the owner (reply-to the enquirer)
      const internal = contactInternalEmail({ name, email, phone, contactMethod, message, submittedAt });
      await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        replyTo: email,
        subject: internal.subject,
        html: internal.html,
        text: internal.text,
      });

      // Auto-reply to the enquirer (reply-to the owner)
      const autoreply = inquiryAutoreplyEmail({ name, message });
      await resend.emails.send({
        from: fromEmail,
        to: email,
        replyTo: toEmail,
        subject: autoreply.subject,
        html: autoreply.html,
        text: autoreply.text,
      });
    } catch (err) {
      console.error('Resend email failed:', err);
    }
  } else {
    console.warn('Email skipped — missing env var(s):', {
      RESEND_API_KEY: !!resendKey,
      EMAIL_FROM: !!fromEmail,
      OWNER_ALERT_EMAIL: !!toEmail,
    });
  }

  if (!saved && !(url && anonKey)) {
    console.warn('Lead received but Supabase env vars are not set yet.');
  }

  return NextResponse.json({ ok: true, saved });
}
