// HTML email templates (light theme, matching the site's blue brand).
// Two emails, both sent by /api/lead: an internal alert to the owner and an
// auto-reply to the enquirer. Each builder returns { subject, html, text }.

import { absoluteUrl, BUSINESS } from './site';

const SANS = `-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;

// User-supplied strings always pass through this before hitting HTML.
function esc(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const firstName = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] || 'there';

// Shared document shell: signature stripe, blue footer with the mailing address.
function shell(opts: { title: string; preheader: string; body: string; footerNote: string }): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(opts.title)}</title>
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background:#eaf0f6; }
  a { color:#456a92; }
  @media screen and (max-width:600px) { .container { width:100% !important; } .px { padding-left:24px !important; padding-right:24px !important; } }
</style>
</head>
<body style="margin:0; padding:0; background-color:#eaf0f6;">
<div style="display:none; font-size:1px; color:#eaf0f6; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${esc(opts.preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#eaf0f6;">
<tr><td align="center" style="padding:28px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:600px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 10px 30px rgba(38,56,82,0.12);">
  <tr><td style="padding:0; font-size:0; line-height:0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td width="60%" height="5" bgcolor="#5580ac" style="font-size:0; line-height:0;">&nbsp;</td>
      <td width="40%" height="5" bgcolor="#b51f21" style="font-size:0; line-height:0;">&nbsp;</td>
    </tr></table>
  </td></tr>
  <tr><td class="px" align="center" style="padding:30px 40px 6px 40px;">
    <p style="margin:0; font-family:${SANS}; font-size:20px; font-weight:600; color:#26313d; letter-spacing:0.3px;">${BUSINESS.name}</p>
  </td></tr>
  ${opts.body}
  <tr><td style="padding:36px 0 0 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#456a92" style="background-color:#456a92;">
      <tr><td class="px" align="center" style="padding:26px 40px;">
        <p style="margin:0 0 8px 0; font-family:${SANS}; font-size:16px; color:#ffffff;">${BUSINESS.name}</p>
        <p style="margin:0 0 12px 0; font-family:${SANS}; font-size:13px; line-height:1.7; color:#d3dfec;">${BUSINESS.address.city}, ${BUSINESS.address.regionName} &middot; ${BUSINESS.phoneDisplay}</p>
        <p style="margin:0; font-family:${SANS}; font-size:12px; line-height:1.7; color:#b9c9dd;">${opts.footerNote}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const eyebrow = (text: string) =>
  `<p style="margin:0 0 10px 0; font-family:${SANS}; font-size:11px; color:#5580ac; text-transform:uppercase; letter-spacing:1.5px; font-weight:700;">${text}</p>`;

const redButton = (href: string, label: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" bgcolor="#b51f21" style="border-radius:10px;">
      <a href="${href}" style="display:inline-block; padding:14px 32px; font-family:${SANS}; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px;">${label}</a>
    </td>
  </tr></table>`;

const detailRow = (label: string, valueHtml: string) => `
  <tr>
    <td width="150" valign="top" style="padding:0 0 12px 0; font-family:${SANS}; font-size:13px; color:#7c8794;">${label}</td>
    <td valign="top" style="padding:0 0 12px 0; font-family:${SANS}; font-size:15px; color:#26313d;">${valueHtml}</td>
  </tr>`;

// ---------------------------------------------------------------
// 1. Internal new-lead alert (to the owner)
// ---------------------------------------------------------------
export function contactInternalEmail(o: {
  name: string;
  email: string;
  phone: string;
  contactMethod: string;
  message: string;
  submittedAt: string;
}) {
  const phoneRaw = o.phone.replace(/[^+\d]/g, '');
  const body = `
  <tr><td class="px" style="padding:26px 40px 0 40px;">
    ${eyebrow(`New enquiry &middot; ${esc(o.submittedAt)}`)}
    <h1 style="margin:0; font-family:${SANS}; font-size:26px; line-height:1.25; font-weight:600; color:#26313d;">${esc(o.name)} wants to get started.</h1>
  </td></tr>
  <tr><td class="px" style="padding:22px 40px 0 40px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${detailRow('Email', `<a href="mailto:${esc(o.email)}" style="color:#456a92; text-decoration:none;">${esc(o.email)}</a>`)}
      ${o.phone ? detailRow('Phone', `<a href="tel:${esc(phoneRaw)}" style="color:#456a92; text-decoration:none;">${esc(o.phone)}</a>`) : ''}
      ${o.contactMethod ? detailRow('Prefers', esc(o.contactMethod)) : ''}
    </table>
  </td></tr>
  <tr><td class="px" style="padding:16px 40px 0 40px;">
    ${eyebrow('What they want to work on')}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f3f6fa" style="background-color:#f3f6fa; border-radius:12px;">
      <tr><td style="padding:22px 24px;">
        <p style="margin:0; font-family:${SANS}; font-size:15px; line-height:1.75; color:#26313d; white-space:pre-wrap;">${esc(o.message) || '&mdash;'}</p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td class="px" align="center" style="padding:28px 40px 0 40px;">
    ${redButton(`mailto:${esc(o.email)}?subject=${encodeURIComponent(`Re: your message to ${BUSINESS.name}`)}`, `Reply to ${esc(firstName(o.name))}`)}
  </td></tr>`;

  const text =
    `New enquiry from the ${BUSINESS.name} website:\n\n` +
    `Name: ${o.name}\nEmail: ${o.email}\nPhone: ${o.phone || '—'}\nPrefers: ${o.contactMethod || '—'}\n\n` +
    `What they want to work on:\n${o.message || '—'}`;

  return {
    subject: `New enquiry from ${o.name}`,
    html: shell({
      title: `New enquiry from ${o.name}`,
      preheader: o.message.slice(0, 120) || `${o.name} reached out through the website.`,
      body,
      footerNote: `Internal notification &middot; ${BUSINESS.name}`,
    }),
    text,
  };
}

// ---------------------------------------------------------------
// 2. Enquiry-received auto-reply (to the enquirer)
// ---------------------------------------------------------------
export function inquiryAutoreplyEmail(o: { name: string; message: string }) {
  const body = `
  <tr><td class="px" align="center" style="padding:26px 40px 0 40px;">
    <h1 style="margin:0 0 14px 0; font-family:${SANS}; font-size:28px; line-height:1.25; font-weight:600; color:#26313d;">Your message landed.</h1>
    <p style="margin:0; font-family:${SANS}; font-size:15px; line-height:1.7; color:#4c5763;">Thanks, ${esc(firstName(o.name))}. I read every message myself and will get back to you soon &mdash; usually within one business day &mdash; to talk through your goals and whether 1:1 online coaching is the right fit.</p>
  </td></tr>
  ${o.message ? `<tr><td class="px" style="padding:26px 40px 0 40px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f3f6fa" style="background-color:#f3f6fa; border-radius:12px;">
      <tr><td style="padding:22px 26px;">
        ${eyebrow('What you sent')}
        <p style="margin:0; font-family:${SANS}; font-size:14px; line-height:1.75; color:#4c5763; white-space:pre-wrap;">${esc(o.message)}</p>
      </td></tr>
    </table>
  </td></tr>` : ''}
  <tr><td class="px" style="padding:28px 40px 0 40px;">
    <p style="margin:0 0 12px 0; font-family:${SANS}; font-size:15px; line-height:1.7; color:#4c5763;">In the meantime, if you&rsquo;d like to reach me faster, just call or text <a href="tel:${BUSINESS.phoneE164}" style="color:#456a92; text-decoration:none;">${BUSINESS.phoneDisplay}</a>.</p>
  </td></tr>
  <tr><td class="px" align="center" style="padding:28px 40px 0 40px;">
    ${redButton(absoluteUrl('/'), 'Visit the website')}
  </td></tr>`;

  const text =
    `Hi ${firstName(o.name)},\n\n` +
    `Thanks for reaching out to ${BUSINESS.name}. I've received your message and will get back to you soon to talk through your goals.\n\n` +
    `If you'd like to reach me faster, call or text ${BUSINESS.phoneDisplay}.\n\n— ${BUSINESS.name}`;

  return {
    subject: `Thanks for reaching out — ${BUSINESS.name}`,
    html: shell({
      title: 'We got your message',
      preheader: 'I’ll get back to you within one business day.',
      body,
      footerNote: `You're getting this because you sent a message through ${BUSINESS.name}. ${BUSINESS.address.city}, ${BUSINESS.address.regionName}.`,
    }),
    text,
  };
}
