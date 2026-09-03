'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Browser client for the owner admin. Persists the login session so the admin
// stays logged in between page loads. Placeholder fallbacks keep builds and
// prerenders from crashing with "supabaseUrl is required." when env vars aren't
// set — with no real keys, getSession() finds no session and admin redirects to login.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

let _client: SupabaseClient | null = null;

export function browserSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _client;
}
