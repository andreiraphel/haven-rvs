import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase(req);
  // Get the most recent active weights
  const { data, error } = await supabase
    .from("risk_weights")
    .select("weights")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows found
      return NextResponse.json(null); // Return null, frontend should fall back to defaults
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.weights);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase(req);
  const body = await req.json();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Insert new row
  const { data, error } = await supabase
    .from("risk_weights")
    .insert({
      weights: body,
      active: true,
      created_by: user.id
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
