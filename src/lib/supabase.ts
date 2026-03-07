import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

// Initialize client. 
// During build time, if vars are missing, it uses placeholders to avoid crashing.
// During runtime on Cloud Run, the real vars will be used.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
