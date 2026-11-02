import type { Metadata } from "next";
import { Container } from "@/components/shell/page-header";
import { PlanWeek, type PlanEntry } from "@/components/plan/plan-week";
import { getProfile, requireUser } from "@/lib/supabase/server";
import { todaySG, weekDays, weekStartFor } from "@/lib/week";

export const metadata: Metadata = { title: "Meal plan" };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ week?: string; day?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const profile = await getProfile();
  const today = todaySG();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(sp.week ?? "") ? sp.week! : today;
  const start = weekStartFor(anchor, profile?.week_start ?? 1);
  const days = weekDays(start);
  const [{ data: entries }, { data: recipes }] = await Promise.all([
    supabase.from("meal_plan_entries")
      .select("id, date, slot, servings, note, position, recipe_id, recipes(id, title, photos, servings, kcal, protein_g, carbs_g, fat_g, counted_count, ingredient_count)")
      .gte("date", days[0]).lte("date", days[6]).order("position").order("created_at"),
    supabase.from("recipes").select("id, title, servings, kcal").order("title").limit(1000),
  ]);
  const selected = sp.day && days.includes(sp.day) ? sp.day : days.includes(today) ? today : days[0];
  return (
    <Container>
      <PlanWeek
        key={start}
        start={start} days={days} today={today} initialDay={selected}
        entries={(entries ?? []) as unknown as PlanEntry[]}
        recipes={recipes ?? []}
        targets={{ kcal: profile?.kcal_target ?? null, protein: profile?.protein_target ?? null, carbs: profile?.carbs_target ?? null, fat: profile?.fat_target ?? null }}
      />
    </Container>
  );
}
