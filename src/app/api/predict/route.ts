import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ML_URL = process.env.ML_API_URL ?? "http://localhost:8000";

  try {
    const mlRes = await fetch(`${ML_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!mlRes.ok) {
      const err = await mlRes.json();
      return NextResponse.json({ error: err.detail ?? "ML server error" }, { status: 500 });
    }

    return NextResponse.json(await mlRes.json());
  } catch {
    return NextResponse.json({ error: "Could not reach ML server" }, { status: 503 });
  }
}

