"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "./recipes";

const num = (max: number) => z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(max).nullable());

const labelSchema = z.object({
  name: z.string().trim().min(1, "Name the food.").max(120),
  brand: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(80).nullable()),
  basis: z.enum(["100g", "serving"]),
  serving_g: num(5000),
  kcal: z.preprocess((v) => Number(v), z.number().min(0).max(5000)),
  protein_g: num(1000), carbs_g: num(1000), fat_g: num(1000), fibre_g: num(1000), sugar_g: num(1000), sat_fat_g: num(1000), sodium_mg: num(100000),
}).refine((d) => d.basis === "100g" || (d.serving_g ?? 0) > 0, { message: "Enter the serving size in grams.", path: ["serving_g"] });

/** Save a packet label. Per-serving labels are converted to per 100 g. */
export async function addCustomFood(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const p = labelSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const d = p.data;
  const f = d.basis === "serving" ? 100 / d.serving_g! : 1;
  const per = (v: number | null) => (v == null ? null : Math.round(v * f * 100) / 100);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("custom_foods").insert({
    name: d.name, brand: d.brand, serving_g: d.serving_g,
    kcal: per(d.kcal)!, protein_g: per(d.protein_g) ?? 0, carbs_g: per(d.carbs_g) ?? 0, fat_g: per(d.fat_g) ?? 0,
    fibre_g: per(d.fibre_g), sugar_g: per(d.sugar_g), sat_fat_g: per(d.sat_fat_g), sodium_mg: per(d.sodium_mg),
  });
  if (error) return { error: "Couldn't save the food." };
  revalidatePath("/me/foods");
  return { ok: true };
}

export async function deleteCustomFood(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid food." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("custom_foods").delete().eq("id", id);
  revalidatePath("/me/foods");
  return error ? { ok: false, error: "Couldn't delete." } : { ok: true };
}
