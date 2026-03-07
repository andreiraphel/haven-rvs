import { createClient } from "@supabase/supabase-js";

// We use a getter function to ensure we always grab the LATEST environment variables.
// In Next.js client components, these are baked in during build, but this pattern
// is safer for ensuring they are available before createClient is called.
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("placeholder")) {
    throw new Error("Supabase credentials missing or invalid.");
  }
  return createClient(url, key);
}

// Keep the export for compatibility, but initialized via the same logic
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);
