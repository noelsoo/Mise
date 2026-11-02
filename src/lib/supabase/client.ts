"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}
