"use client";
import { useEffect } from "react";
import { markOpened } from "@/lib/actions/recipes";

/** Records "recently opened" (used for sorting and for offline caching). */
export function MarkOpened({ id }: { id: string }) {
  useEffect(() => { void markOpened(id); }, [id]);
  return null;
}
