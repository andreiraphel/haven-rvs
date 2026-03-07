import { createClient } from "@supabase/supabase-js";

/**
 * Robust Supabase Client Loader
 * 1. Build time: Uses placeholders to avoid crashing Next.js.
 * 2. Runtime (Local): Uses .env.local values.
 * 3. Runtime (Cloud Run): Uses Environment Variables.
 */
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

  // We only warn here, we don't throw, to allow the app to boot up.
  if (url.includes("placeholder")) {
    console.warn("⚠️ Warning: Supabase URL is using placeholder. Check environment variables.");
  }

  return createClient(url, key);
}

// Default export for standard usage
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);
