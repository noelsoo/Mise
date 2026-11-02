"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requestPasswordReset, sendMagicLink, signInWithPassword, signUp, updatePassword, type AuthState } from "@/app/(auth)/actions";

function Status({ state }: { state: AuthState }) {
  if (state?.error) return <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">{state.error}</p>;
  if (state?.message) return <p role="status" className="rounded-md bg-primary-soft px-4 py-3 text-sm text-primary">{state.message}</p>;
  return null;
}

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, undefined);
  const [mlState, mlAction, mlPending] = useActionState(sendMagicLink, undefined);
  const magic = mode === "magic";
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-1">
      <h1 className="text-3xl">Welcome back</h1>
      <p className="mt-1 text-ink-muted">Sign in to your recipes, plan and list.</p>
      <div role="tablist" aria-label="Sign-in method" className="mt-6 grid grid-cols-2 rounded-md bg-surface-muted p-1">
        {(["password", "magic"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`min-h-11 rounded-md text-sm font-semibold ${mode === m ? "bg-surface shadow-1" : "text-ink-muted"}`}>
            {m === "password" ? "Password" : "Magic link"}
          </button>
        ))}
      </div>
      <form action={magic ? mlAction : pwAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" htmlFor="email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted" aria-hidden />
            <Input id="email" name="email" type="email" autoComplete="email" required className="pl-12" />
          </div>
        </Field>
        {!magic ? (
          <Field label="Password" htmlFor="password">
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
        ) : null}
        <Status state={magic ? mlState : pwState} />
        <Button type="submit" className="w-full" disabled={magic ? mlPending : pwPending}>
          {magic ? (mlPending ? "Sending…" : "Email me a link") : pwPending ? "Signing in…" : "Sign in"} <ArrowRight aria-hidden />
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="font-semibold text-primary hover:underline">Forgot password?</Link>
        <Link href="/signup" className="font-semibold text-primary hover:underline">Create an account</Link>
      </div>
    </div>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-1">
      <h1 className="text-3xl">Create your account</h1>
      <p className="mt-1 text-ink-muted">Free, and your data exports any time.</p>
      <form action={action} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password" htmlFor="password" hint="At least 10 characters.">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Status state={state} />
        <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating…" : "Create account"}</Button>
      </form>
      <p className="mt-6 text-sm">Already have one? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
    </div>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-1">
      <h1 className="text-3xl">Reset your password</h1>
      <p className="mt-1 text-ink-muted">We&apos;ll email you a link to set a new one.</p>
      <form action={action} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
        <Status state={state} />
        <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
      </form>
      <p className="mt-6 text-sm"><Link href="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link></p>
    </div>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="New password" htmlFor="password" hint="At least 10 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Confirm password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Status state={state} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Save password"}</Button>
    </form>
  );
}
