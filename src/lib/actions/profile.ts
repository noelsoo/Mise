"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const optionalInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(min).max(max).nullable());

const profileSchema = z.object({
  display_name: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(80).nullable()),
  units: z.enum(["metric", "us"]),
  week_start: z.coerce.number().int().min(0).max(6),
  kcal_target: optionalInt(500, 10000),
  protein_target: optionalInt(0, 1000),
  carbs_target: optionalInt(0, 2000),
  fat_target: optionalInt(0, 1000),
});

export type ProfileState = { error?: string; saved?: boolean } | undefined;

async function save(form: FormData, extra: { onboarded?: boolean }) {
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: `Check ${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ ...parsed.data, ...extra }).eq("id", user.id);
  if (error) return { error: "Couldn't save your settings. Try again." };
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function completeOnboarding(_: ProfileState, form: FormData): Promise<ProfileState> {
  const res = await save(form, { onboarded: true });
  if (res.error) return res;
  redirect("/recipes");
}

export async function skipOnboarding() {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
  redirect("/recipes");
}

export async function updateProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  return save(form, {});
}

export async function setUnits(units: "metric" | "us") {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ units }).eq("id", user.id);
  revalidatePath("/", "layout");
}

export async function deleteAccount(): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  // Remove the user's images first: storage objects aren't covered by the DB cascade.
  const { data: files } = await supabase.storage.from("recipe-images").list(user.id, { limit: 1000 });
  const paths: string[] = [];
  for (const f of files ?? []) {
    if (f.id) paths.push(`${user.id}/${f.name}`);
    else {
      const { data: inner } = await supabase.storage.from("recipe-images").list(`${user.id}/${f.name}`, { limit: 1000 });
      inner?.forEach((i) => paths.push(`${user.id}/${f.name}/${i.name}`));
    }
  }
  if (paths.length) await supabase.storage.from("recipe-images").remove(paths);
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "Couldn't delete the account. Try again." };
  await supabase.auth.signOut();
  redirect("/login");
}
