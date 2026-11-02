"use server";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { parseLocalDate, toYmd } from "@/lib/utils";
import type { ActionResult } from "./recipes";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(parseLocalDate(s).getTime()));
const slot = z.enum(["breakfast", "lunch", "dinner", "snack"]);

const entry = z.object({
  date: ymd, slot,
  recipeId: z.string().uuid().nullable(),
  servings: z.number().positive().max(100).nullable(),
  note: z.string().trim().max(200).nullable(),
}).refine((e) => e.recipeId || e.note, "Pick a recipe or write a note.");

export async function addPlanEntry(input: z.input<typeof entry>): Promise<ActionResult> {
  const p = entry.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid entry." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("meal_plan_entries").insert({
    date: p.data.date, slot: p.data.slot, recipe_id: p.data.recipeId, servings: p.data.recipeId ? p.data.servings ?? 1 : null, note: p.data.note || null,
  });
  revalidatePath("/plan");
  return error ? { ok: false, error: "Couldn't add to the plan." } : { ok: true };
}

export async function updatePlanServings(id: string, servings: number): Promise<ActionResult> {
  const p = z.object({ id: z.string().uuid(), s: z.number().positive().max(100) }).safeParse({ id, s: servings });
  if (!p.success) return { ok: false, error: "Invalid servings." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("meal_plan_entries").update({ servings: p.data.s }).eq("id", id);
  revalidatePath("/plan");
  return error ? { ok: false, error: "Couldn't update." } : { ok: true };
}

export async function deletePlanEntry(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid entry." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("meal_plan_entries").delete().eq("id", id);
  revalidatePath("/plan");
  return error ? { ok: false, error: "Couldn't remove." } : { ok: true };
}

/** Copy last week's entries into the week starting `weekStart`, skipping slots already filled identically. */
export async function copyLastWeek(weekStart: string): Promise<ActionResult<{ copied: number }>> {
  if (!ymd.safeParse(weekStart).success) return { ok: false, error: "Invalid week." };
  const { supabase } = await requireUser();
  const start = parseLocalDate(weekStart);
  const prevStart = toYmd(addDays(start, -7));
  const prevEnd = toYmd(addDays(start, -1));
  const thisEnd = toYmd(addDays(start, 6));
  const [{ data: prev }, { data: current }] = await Promise.all([
    supabase.from("meal_plan_entries").select("*").gte("date", prevStart).lte("date", prevEnd),
    supabase.from("meal_plan_entries").select("date, slot, recipe_id, note").gte("date", weekStart).lte("date", thisEnd),
  ]);
  if (!prev?.length) return { ok: false, error: "Last week's plan is empty." };
  const have = new Set((current ?? []).map((c) => `${c.date}|${c.slot}|${c.recipe_id}|${c.note}`));
  const rows = prev.map((e) => ({
    date: toYmd(addDays(parseLocalDate(e.date), 7)), slot: e.slot, recipe_id: e.recipe_id, servings: e.servings, note: e.note, position: e.position,
  })).filter((r) => !have.has(`${r.date}|${r.slot}|${r.recipe_id}|${r.note}`));
  if (rows.length) {
    const { error } = await supabase.from("meal_plan_entries").insert(rows);
    if (error) return { ok: false, error: "Couldn't copy last week." };
  }
  revalidatePath("/plan");
  return { ok: true, data: { copied: rows.length } };
}
