import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../shared/database.types';

function getSupabaseUrl(): string {
  if (!process.env.SUPABASE_URL) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }
  return process.env.SUPABASE_URL;
}

function getSupabaseAnonKey(): string {
  if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error('Missing SUPABASE_ANON_KEY environment variable');
  }
  return process.env.SUPABASE_ANON_KEY;
}

let _supabase: ReturnType<typeof createClient<Database>> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = createClient<Database>(
        getSupabaseUrl(),
        getSupabaseAnonKey()
      );
    }
    return (_supabase as any)[prop];
  }
});

export function createServerClient(accessToken?: string) {
  if (accessToken) {
    return createClient<Database>(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
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
