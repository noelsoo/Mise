import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { localDateString } from "@/lib/utils";

// Every table the user owns. RLS scopes each query to the caller.
const TABLES = ["profiles", "recipes", "ingredients", "steps", "cookbooks", "cookbook_recipes", "meal_plan_entries", "grocery_items", "custom_foods", "food_matches"] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), email: auth.user.email };
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select("*").limit(10000);
    if (error) return NextResponse.json({ error: "Export failed" }, { status: 500 });
    out[t] = data;
  }
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="mise-export-${localDateString()}.json"`,
      "cache-control": "no-store",
    },
  });
}
