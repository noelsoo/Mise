"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import Image from "next/image";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#plan", label: "Meal plan" },
  { href: "#cook-mode", label: "Cook mode" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingNav({ appHref, signedIn }: { appHref: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Mise home">
          <Image src="/icons/icon-192.png" alt="" width={36} height={36} className="size-9 rounded-[9px]" priority />
          <span className="leading-tight"><span className="block font-serif text-xl">Mise</span><span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted sm:block">Culinary ledger</span></span>
        </Link>
        <nav aria-label="Sections" className="ml-6 hidden items-center gap-6 text-sm font-medium lg:flex">
          {LINKS.map((l) => <a key={l.href} href={l.href} className="text-ink-muted hover:text-ink">{l.label}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {!signedIn ? <Link href="/login" className="hidden min-h-11 items-center rounded-md px-3 text-sm font-semibold hover:bg-surface sm:inline-flex">Sign in</Link> : null}
          <Link href={appHref} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover">
            {signedIn ? "Open Mise" : "Launch web app"} <ArrowRight className="size-4" aria-hidden />
          </Link>
          <button className="grid size-11 place-items-center rounded-md hover:bg-surface lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="landing-menu" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="landing-menu" aria-label="Sections" className="border-t border-border bg-canvas px-4 py-2 lg:hidden">
          {LINKS.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center border-b border-border text-base last:border-0">{l.label}</a>)}
          {!signedIn ? <Link href="/login" className="flex min-h-12 items-center text-base font-semibold text-primary">Sign in</Link> : null}
        </nav>
      ) : null}
    </header>
  );
}
