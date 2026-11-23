import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// null when the project has no Supabase keys yet (local development)
export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true },
    })
  : null;

export const isAuthConfigured = Boolean(supabase);

export function authCallbackUrl() {
  return `${window.location.origin}/auth/callback.html`;
}
