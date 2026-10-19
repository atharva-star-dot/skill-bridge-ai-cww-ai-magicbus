import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicConfig } from './config';

/**
 * Browser-side Supabase client singleton.
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createClient() {
  const { url, key } = getSupabasePublicConfig();
  return createBrowserClient(url, key);
}
