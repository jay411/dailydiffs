import { createClient } from '@supabase/supabase-js';

let _client: ReturnType<typeof createClient> | null = null;

/** Supabase client using the service role key — bypasses RLS. Server-side only. */
export function getSupabaseAdmin() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  _client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

/**
 * Untyped admin client for use without generated DB types.
 * Use this when the Supabase client returns `never` due to missing schema types.
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAdminDb(): any {
  return getSupabaseAdmin();
}
