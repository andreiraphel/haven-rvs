import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase(req);
  const { data, error } = await supabase
    .from("buildings")
    .select("*, risk_results(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase(req);
    const body = await req.json();

    // Clean data: remove any potential client-side noise like empty strings for UUIDs
    const { id, created_at, updated_at, ...insertData } = body;

    const { data, error } = await supabase.from("buildings").insert(insertData).select().single();

    if (error) {
      console.error("Supabase Insert Error:", error);
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Buildings POST Route Crash:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabase(req);
    const body = await req.json();
    const { id, created_at, updated_at, created_by, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing building ID" }, { status: 400 });
    }

    const { data, error } = await supabase.from("buildings").update(updateData).eq("id", id).select().single();

    if (error) {
      console.error("Supabase Update Error:", error);
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("Buildings PUT Route Crash:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}