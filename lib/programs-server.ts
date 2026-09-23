// Server-only data access for the public programs pages. Reads PUBLISHED
// programs from Supabase via the service role (there's no anon policy), and
// falls back to the static PROGRAMS list if the DB isn't reachable so the site
// never breaks. Never import this from a client component.
import { createClient } from '@supabase/supabase-js';
import { PROGRAMS, type Program } from './programs';

type Row = {
  slug: string; name: string; tagline: string; description: string;
  price_display: string; price_note: string; term_options: string;
  features: unknown; cover_image: string; cta_label: string; ptd_url: string;
  one_off: boolean; ptd_url_home: string; ptd_url_gym: string;
  featured: boolean; published: boolean; sort_order: number;
};

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function mapRow(r: Row): Program {
  return {
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    priceDisplay: r.price_display,
    priceNote: r.price_note || undefined,
    termOptions: r.term_options,
    features: Array.isArray(r.features) ? (r.features as string[]) : [],
    coverImage: r.cover_image,
    ctaLabel: r.cta_label || undefined,
    ptdUrl: r.ptd_url || undefined,
    oneOff: r.one_off,
    ptdUrlGym: r.ptd_url_gym || undefined,
    ptdUrlHome: r.ptd_url_home || undefined,
    featured: r.featured,
    published: r.published,
  };
}

export async function getPublishedPrograms(): Promise<Program[]> {
  const client = db();
  if (!client) return PROGRAMS.filter((p) => p.published);
  const { data, error } = await client
    .from('programs').select('*')
    .eq('published', true)
    .order('sort_order', { ascending: true });
  if (error || !data || data.length === 0) return PROGRAMS.filter((p) => p.published);
  return (data as Row[]).map(mapRow);
}

export async function getPublishedProgram(slug: string): Promise<Program | undefined> {
  const client = db();
  if (!client) return PROGRAMS.find((p) => p.slug === slug && p.published);
  const { data, error } = await client
    .from('programs').select('*')
    .eq('slug', slug).eq('published', true).maybeSingle();
  if (error || !data) return PROGRAMS.find((p) => p.slug === slug && p.published);
  return mapRow(data as Row);
}
