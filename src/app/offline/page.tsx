import { CloudOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-16 text-center">
      <Logo className="justify-center" />
      <CloudOff className="mx-auto mt-10 size-10 text-ink-muted" aria-hidden />
      <h1 className="mt-4 text-3xl">You&apos;re offline</h1>
      <p className="mt-2 text-ink-muted">Recipes you&apos;ve opened recently, this week&apos;s plan and your grocery list still work. Open them from the menu, or try again when you&apos;re back online.</p>
      {/* Plain links on purpose: full navigations let the service worker serve cached pages. */}
      {/* eslint-disable @next/next/no-html-link-for-pages */}
      <nav className="mt-6 flex justify-center gap-4 font-semibold text-primary">
        <a href="/groceries">Grocery list</a><a href="/plan">Plan</a><a href="/recipes">Recipes</a>
      </nav>
    </main>
  );
}
