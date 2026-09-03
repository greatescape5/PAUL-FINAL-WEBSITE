'use client';

import { useState } from 'react';

const CONTACT_METHODS = ['Email', 'Phone call', 'Text message'];

type Status = 'idle' | 'sending' | 'ok' | 'error';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
      contact_method: (form.elements.namedItem('contact_method') as HTMLSelectElement).value,
      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('ok');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <div className="alert ok">
        Thanks for reaching out! Your message came through — I&rsquo;ll be in touch
        soon to talk through your goals.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {status === 'error' && (
        <div className="alert err">
          Something went wrong sending your message. Please try again, or email me
          directly.
        </div>
      )}

      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required placeholder="Your name" />
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required placeholder="you@example.com" />
      </div>

      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" placeholder="(208) 555-0123" />
      </div>

      <div className="field">
        <label htmlFor="contact_method">Best way to contact you</label>
        <select id="contact_method" name="contact_method" defaultValue="">
          <option value="" disabled>Select one…</option>
          {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="message">What are you hoping to work on?</label>
        <textarea id="message" name="message" placeholder="Your goals, your schedule, what you've tried before, what you'd love to change…" />
      </div>

      <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Submit'}
      </button>
      <p className="form-note" style={{ marginTop: 12 }}>
        Your details are only used to respond to your message.
      </p>
    </form>
  );
}
