import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Heart } from "lucide-react";
import { Container, PageHeader } from "@/components/shell/page-header";
import { NewCookbookButton } from "@/components/cookbooks";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cookbooks" };

export default async function CookbooksPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: startNew } = await searchParams;
  const { supabase } = await requireUser();
  const [{ data: books }, { count: total }, { count: favs }] = await Promise.all([
    supabase.from("cookbooks").select("id, name, description, cookbook_recipes(count)").order("name"),
    supabase.from("recipes").select("id", { count: "exact", head: true }),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("favourite", true),
  ]);
  const tiles = [
    { href: "/recipes", name: "All recipes", desc: "Everything you've saved", count: total ?? 0, icon: BookOpen },
    { href: "/recipes?filter=favourites", name: "Favourites", desc: "Recipes you've hearted", count: favs ?? 0, icon: Heart },
    ...(books ?? []).map((b) => ({ href: `/cookbooks/${b.id}`, name: b.name, desc: b.description ?? "", count: (b.cookbook_recipes as unknown as { count: number }[])[0]?.count ?? 0, icon: BookOpen })),
  ];
  return (
    <Container>
      <PageHeader eyebrow="Collections" title="Cookbooks"><NewCookbookButton startOpen={startNew === "1"} /></PageHeader>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.href}><Card className="relative p-5 transition hover:shadow-2">
            <t.icon className="size-6 text-primary" aria-hidden />
            <h2 className="mt-3 text-xl"><Link href={t.href} className="after:absolute after:inset-0">{t.name}</Link></h2>
            <p className="text-sm text-ink-muted"><span className="tnum">{t.count}</span> recipes{t.desc ? ` · ${t.desc}` : ""}</p>
          </Card></li>
        ))}
      </ul>
    </Container>
  );
}
