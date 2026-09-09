import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { newsletterEmail, offerCtaBlock } from '@/lib/emails';
import { absoluteUrl } from '@/lib/site';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Very small, conservative sanitizer + style inliner for the composer's HTML.
// The author is the authenticated owner, so this is belt-and-suspenders, not a
// defense against hostile input.
function cleanContent(raw: string): string {
  let html = raw;
  html = html.replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  html = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  html = html.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  html = html.replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
  // Inline base styles on bare block tags so Gmail (which drops <style>) matches.
  const inject = (tag: string, style: string) => {
    html = html.replace(new RegExp(`<${tag}(?![^>]*style=)`, 'gi'), `<${tag} style="${style}"`);
  };
  inject('h1', 'font-size:26px;line-height:1.3;font-weight:700;margin:20px 0 10px;color:#26313d;');
  inject('h2', 'font-size:22px;line-height:1.3;font-weight:700;margin:18px 0 8px;color:#26313d;');
  inject('h3', 'font-size:18px;line-height:1.35;font-weight:700;margin:16px 0 6px;color:#26313d;');
  inject('p', 'margin:0 0 14px;');
  inject('a', 'color:#456a92;');
  inject('img', 'max-width:100%;height:auto;border-radius:8px;margin:10px 0;');
  inject('ul', 'margin:0 0 14px;padding-left:22px;');
  inject('ol', 'margin:0 0 14px;padding-left:22px;');
  return html;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;

  // ---- Require a valid signed-in CRM user (bearer token from the client) ----
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!url || !anonKey || !token) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  if (!serviceKey) {
    return NextResponse.json({ error: 'Server is not configured for sending.' }, { status: 500 });
  }
  if (!resendKey || !fromEmail) {
    return NextResponse.json({ error: 'Email sending is not configured (missing Resend key or from-address).' }, { status: 500 });
  }

  let body: { subject?: string; html?: string; includeCta?: boolean };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const subject = (body.subject || '').trim();
  const content = (body.html || '').trim();
  if (!subject || !content) {
    return NextResponse.json({ error: 'A subject and some content are required.' }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Optional sign-up CTA block, appended after the body.
  let offerHtml = '';
  if (body.includeCta) {
    const { data: offer } = await admin
      .from('newsletter_offer').select('*').eq('id', 1).maybeSingle();
    if (offer?.enabled) {
      offerHtml = offerCtaBlock({
        name: offer.name, priceDisplay: offer.price_display, description: offer.description,
        buttonLabel: offer.button_label, signupUrl: offer.signup_url,
      });
    }
  }

  const { data: subs, error: subErr } = await admin
    .from('subscribers').select('email,unsub_token')
    .eq('status', 'subscribed');
  if (subErr) {
    return NextResponse.json({ error: 'Could not load subscribers.' }, { status: 500 });
  }
  const recipients = (subs ?? []).filter((s) => s.email);
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No subscribed recipients to send to.' }, { status: 400 });
  }

  const cleaned = cleanContent(content);

  // ---- Send via Resend in batches of 100 (each with its own unsubscribe link) ----
  let sent = 0;
  const sentEmails: string[] = [];
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    for (const group of chunk(recipients, 100)) {
      const batch = group.map((r) => {
        const mail = newsletterEmail({
          subject,
          contentHtml: cleaned,
          offerHtml,
          unsubscribeUrl: absoluteUrl(`/unsubscribe?token=${r.unsub_token}`),
        });
        return { from: fromEmail, to: r.email as string, subject: mail.subject, html: mail.html };
      });
      const { error } = await resend.batch.send(batch);
      if (error) {
        console.error('Resend batch error:', error);
      } else {
        sent += batch.length;
        for (const r of group) sentEmails.push(r.email as string);
      }
    }
  } catch (err) {
    console.error('Newsletter send error:', err);
    return NextResponse.json({ error: 'Sending failed partway through. Some emails may have gone out.' }, { status: 500 });
  }

  // ---- Log the broadcast (with the exact recipient list) ----
  await admin.from('newsletter_broadcasts').insert({
    subject, body_html: cleaned, sent_count: sent, recipients: sentEmails, created_by: userData.user.id,
  });

  return NextResponse.json({ ok: true, sent });
}
