"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Plus, ShoppingBasket, User } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const items = [
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/add", label: "Add", icon: Plus, primary: true },
  { href: "/groceries", label: "Groceries", icon: ShoppingBasket },
  { href: "/me", label: "Me", icon: User },
];

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`) || (href === "/recipes" && path.startsWith("/cookbooks"));
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((it) => {
          const active = isActive(path, it.href);
          return (
            <li key={it.href} className="flex justify-center">
              <Link href={it.href} aria-current={active ? "page" : undefined}
                className={cn("flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium", active ? "text-primary" : "text-ink-muted")}>
                {it.primary ? (
                  <span className="-mt-6 grid size-14 place-items-center rounded-full bg-accent text-white shadow-3"><it.icon className="size-7" aria-hidden /></span>
                ) : (
                  <it.icon className="size-6" aria-hidden />
                )}
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar({ cookbooks }: { cookbooks: { id: string; name: string; count: number }[] }) {
  const path = usePathname();
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <Link href="/recipes" className="px-2"><Logo withTagline /></Link>
      <Link href="/add" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-accent px-4 font-semibold text-white shadow-2 hover:brightness-95">
        <Plus className="size-5" aria-hidden /> Add recipe
      </Link>
      <nav aria-label="Main" className="mt-6">
        <ul className="space-y-1">
          {items.filter((i) => !i.primary).map((it) => {
            const active = isActive(path, it.href);
            return (
              <li key={it.href}>
                <Link href={it.href} aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium", active ? "bg-primary-soft text-primary" : "text-ink hover:bg-surface-muted")}>
                  <it.icon className="size-5" aria-hidden /> {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-8 border-t border-border pt-4">
        <p className="label-caps px-3 text-ink-muted">Cookbooks</p>
        <ul className="mt-2 space-y-1 overflow-y-auto">
          {cookbooks.map((c) => (
            <li key={c.id}>
              <Link href={`/cookbooks/${c.id}`} className={cn("flex min-h-11 items-center justify-between rounded-md px-3 text-sm", path === `/cookbooks/${c.id}` ? "bg-primary-soft text-primary" : "hover:bg-surface-muted")}>
                <span className="truncate">{c.name}</span>
                <span className="tnum rounded-full bg-surface-muted px-2 text-xs text-ink-muted">{c.count}</span>
              </Link>
            </li>
          ))}
          <li><Link href="/cookbooks" className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-primary hover:bg-surface-muted">All cookbooks</Link></li>
        </ul>
      </div>
    </aside>
  );
}
