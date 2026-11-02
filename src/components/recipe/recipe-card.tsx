import Image from "next/image";
import Link from "next/link";
import { Clock, UtensilsCrossed } from "lucide-react";
import { Card, MacroPill } from "@/components/ui/card";
import { FavouriteButton } from "./favourite-button";
import type { RecipeRow } from "@/lib/supabase/database.types";
import { publicImageUrl } from "@/lib/env";

export type CardRecipe = Pick<RecipeRow, "id" | "title" | "photos" | "prep_minutes" | "cook_minutes" | "kcal" | "protein_g" | "carbs_g" | "fat_g" | "servings" | "favourite" | "counted_count" | "ingredient_count">;

export function RecipeCard({ r, priority }: { r: CardRecipe; priority?: boolean }) {
  const mins = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);
  const partial = r.counted_count < r.ingredient_count;
  return (
    <Card className="group relative flex flex-col overflow-hidden transition hover:shadow-2">
      <div className="relative aspect-[16/10] bg-surface-high">
        {r.photos[0] ? (
          <Image src={publicImageUrl(r.photos[0])} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" priority={priority} />
        ) : (
          <div className="grid h-full place-items-center text-ink-muted"><UtensilsCrossed className="size-8" aria-hidden /></div>
        )}
        {mins ? <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white tnum"><Clock className="size-3.5" aria-hidden />{mins} min</span> : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-lg leading-6">
          <Link href={`/recipes/${r.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">{r.title}</Link>
        </h3>
        <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
          {r.kcal != null ? <span className="font-semibold text-accent tnum">{partial ? "≥" : ""}{Math.round(r.kcal)} kcal</span> : <span>No macros yet</span>}
          <span aria-hidden>·</span><span className="tnum">{r.servings} serving{Number(r.servings) === 1 ? "" : "s"}</span>
        </p>
        {r.protein_g != null ? <div className="mt-auto flex flex-wrap gap-1.5 pt-3"><MacroPill macro="protein" grams={r.protein_g} partial={partial} /></div> : null}
      </div>
      <div className="absolute right-2 top-2 z-10"><FavouriteButton id={r.id} favourite={r.favourite} /></div>
    </Card>
  );
}
