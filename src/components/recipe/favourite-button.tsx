"use client";
import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { setFavourite } from "@/lib/actions/recipes";
import { cn } from "@/lib/utils";

export function FavouriteButton({ id, favourite, className }: { id: string; favourite: boolean; className?: string }) {
  const [fav, setFav] = useOptimistic(favourite);
  const [, start] = useTransition();
  return (
    <button type="button" aria-pressed={fav} aria-label={fav ? "Remove from favourites" : "Add to favourites"}
      onClick={() => start(async () => { setFav(!fav); await setFavourite(id, !fav); })}
      className={cn("grid size-11 place-items-center rounded-full bg-surface/90 shadow-1 backdrop-blur", className)}>
      <Heart className={cn("size-5", fav ? "fill-accent text-accent" : "text-ink")} />
    </button>
  );
}
