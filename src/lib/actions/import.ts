"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { extractRecipeFromHtml } from "@/lib/import/schema-org";
import { fetchImage, fetchRecipePage } from "@/lib/import/fetch-page";
import { parseRecipeText } from "@/lib/import/text";
import type { RecipeDraft } from "@/lib/import/types";

export type ImportResult = { ok: true; draft: RecipeDraft; photos: string[]; warning?: string } | { ok: false; error: string };

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** Copy the first usable image into the user's Storage folder instead of hot-linking the source site. */
async function saveFirstImage(urls: string[], userId: string, supabase: Awaited<ReturnType<typeof requireUser>>["supabase"]) {
  for (const url of urls.slice(0, 3)) {
    try {
      const { bytes, type } = await fetchImage(url);
      const path = `${userId}/${randomUUID()}.${EXT[type] ?? "jpg"}`;
      const { error } = await supabase.storage.from("recipe-images").upload(path, bytes, { contentType: type, cacheControl: "31536000" });
      if (!error) return path;
    } catch {
      // Try the next candidate; an import without a photo is still useful.
    }
  }
  return null;
}

export async function importFromUrl(url: string): Promise<ImportResult> {
  const parsed = z.string().trim().url().max(2000).safeParse(url);
  if (!parsed.success) return { ok: false, error: "Paste a full link starting with https://" };
  const { supabase, user } = await requireUser();
  let html: string;
  try {
    html = await fetchRecipePage(parsed.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/disallowed|not allowed|Invalid URL|scheme|private/i.test(msg)) return { ok: false, error: "That link can't be imported." };
    return { ok: false, error: "Couldn't open that page. Check the link, or paste the recipe text instead." };
  }
  const draft = extractRecipeFromHtml(html, parsed.data);
  if (!draft) return { ok: false, error: "No recipe data found on that page. Paste the recipe text instead." };
  draft.sourceUrl = parsed.data;
  const photo = draft.imageUrls.length ? await saveFirstImage(draft.imageUrls, user.id, supabase) : null;
  return { ok: true, draft, photos: photo ? [photo] : [], warning: draft.imageUrls.length && !photo ? "The recipe photo couldn't be copied. Add one before saving if you like." : undefined };
}

export async function importFromText(text: string): Promise<ImportResult> {
  const parsed = z.string().trim().min(10, "Paste a bit more of the recipe.").max(50000).safeParse(text);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Paste the recipe text." };
  await requireUser();
  const draft = parseRecipeText(parsed.data);
  if (!draft.ingredients.length && !draft.steps.length) return { ok: false, error: "Couldn't find ingredients or steps in that text." };
  return { ok: true, draft, photos: [] };
}
