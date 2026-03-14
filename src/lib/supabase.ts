import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

if (url.includes("placeholder") || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (typeof window !== 'undefined') {
    console.warn("⚠️ Warning: Supabase URL/Key is missing or using placeholder. Check environment variables.");
  }
}

// Single instance of Supabase Client for the whole application
// This prevents multiple "auth state listeners" from fighting over localStorage/refresh tokens
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * @deprecated Use the exported `supabase` singleton instead.
 * Creating multiple clients can lead to "Invalid Refresh Token" errors.
 */
export function getSupabase() {
  return supabase;
}
