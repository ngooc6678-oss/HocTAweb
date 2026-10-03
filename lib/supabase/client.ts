import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Wordnest chưa được kết nối với Supabase.');
  return createBrowserClient(config.url, config.key);
}
