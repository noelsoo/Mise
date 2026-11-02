import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      {error ? <p role="alert" className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">That link has expired or was already used. Request a new one.</p> : null}
      <LoginForm next={next} />
    </>
  );
}
