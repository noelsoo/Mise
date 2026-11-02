import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Pinged daily by GitHub Actions so the free Supabase project never pauses.
export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("health");
  if (error || data !== "ok") return NextResponse.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
