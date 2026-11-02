import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/components/auth-forms";
import { Logo } from "@/components/brand/logo";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  if (!(await getUser())) redirect("/login?error=link");
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-12">
      <Logo />
      <div className="mt-8 rounded-xl border border-border bg-surface p-6 shadow-1">
        <h1 className="mb-6 text-3xl">Set a new password</h1>
        <NewPasswordForm />
      </div>
    </main>
  );
}
