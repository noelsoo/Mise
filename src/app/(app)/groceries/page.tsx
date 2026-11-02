import type { Metadata } from "next";
import { Container } from "@/components/shell/page-header";
import { GroceryList } from "@/components/groceries/grocery-list";
import { getProfile, requireUser } from "@/lib/supabase/server";
import { todaySG, weekStartFor } from "@/lib/week";

export const metadata: Metadata = { title: "Groceries" };

export default async function GroceriesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const profile = await getProfile();
  const week = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : weekStartFor(todaySG(), profile?.week_start ?? 1);
  const { data } = await supabase.from("grocery_items").select("*").order("aisle").order("position").order("created_at");
  return <Container className="max-w-3xl"><GroceryList key={(data ?? []).map((d) => `${d.id}${d.checked ? 1 : 0}${d.quantity_text}`).join()} initial={data ?? []} week={week} /></Container>;
}
