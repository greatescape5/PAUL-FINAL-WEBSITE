import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Public (anon) server client — safe to use with RLS protecting the data.
// Lazily created; returns null when env vars are missing so a build with no
// keys can't crash on "supabaseUrl is required." All reads below swallow
// errors and return safe empty values.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!_client) _client = createClient(url, anonKey);
  return _client;
}

// ---- Types (grown per phase) ----

// Success Stories gallery (Phase 3).
export type GalleryCategory = {
  id: string;
  name: string;
  sort_order: number;
  is_hidden: boolean;
};

export type GalleryItem = {
  id: string;
  category_id: string | null;
  image_url: string;
  caption: string | null;
  description: string | null;
  sort_order: number;
  is_hidden: boolean;
  created_at: string;
};

// Published success-story categories, ordered.
export async function getGalleryCategories(): Promise<GalleryCategory[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('gallery_categories')
      .select('*')
      .eq('is_hidden', false)
      .order('sort_order', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

// Published success-story photos, ordered.
export async function getGalleryItems(): Promise<GalleryItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('gallery_items')
      .select('*')
      .eq('is_hidden', false)
      .order('sort_order', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}
