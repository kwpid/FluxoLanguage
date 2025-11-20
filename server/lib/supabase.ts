import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../shared/database.types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase not configured on server - authentication features will be disabled');
}

let _supabase: ReturnType<typeof createClient<Database>> | null = null;

if (isSupabaseConfigured) {
  _supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!);
}

export const supabase = _supabase;

export function createServerClient(accessToken?: string) {
  if (!isSupabaseConfigured) {
    return null;
  }
  
  if (accessToken) {
    return createClient<Database>(
      supabaseUrl!,
      supabaseAnonKey!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );
  }
  return supabase;
}
