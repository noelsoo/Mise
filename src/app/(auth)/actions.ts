"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";

export type AuthState = { error?: string; message?: string } | undefined;

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
const password = z.string().min(10, "Use at least 10 characters.").max(128);

// Only allow same-site relative paths after sign-in (no open redirects).
function safeNext(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/recipes";
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : SITE_URL;
}

export async function signInWithPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.").max(128) }).safeParse({
    email: form.get("email"), password: form.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for unknown email and wrong password, so accounts can't be enumerated.
  if (error) return { error: error.status === 429 ? "Too many attempts. Wait a minute and try again." : "That email and password don't match." };
  redirect(safeNext(form.get("next")));
}

export async function sendMagicLink(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const next = safeNext(form.get("next"));
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error?.status === 429) return { error: "Too many emails sent. Wait a minute and try again." };
  return { message: "Check your inbox. The link signs you in on this device." };
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ email, password }).safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error) {
    if (error.status === 429) return { error: "Too many attempts. Wait a minute and try again." };
    if (/password/i.test(error.message)) return { error: error.message };
    return { error: "Couldn't create the account. Try again." };
  }
  if (data.session) redirect("/onboarding");
  return { message: "Check your inbox to confirm your email, then sign in." };
}

export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${await origin()}/auth/callback?next=/auth/reset-password` });
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = password.safeParse(form.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (form.get("password") !== form.get("confirm")) return { error: "The passwords don't match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: "Couldn't update the password. Request a new reset link." };
  redirect("/recipes");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
