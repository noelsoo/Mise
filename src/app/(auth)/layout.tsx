import { BookOpen, PieChart, ShoppingBasket } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const features = [
  { icon: BookOpen, title: "Save recipes from anywhere", body: "Import from a link, pasted text or a photo, then edit before saving.", tint: "bg-primary-soft text-primary" },
  { icon: PieChart, title: "Macros per serving", body: "USDA data, with every ingredient shown as counted or not.", tint: "bg-accent-soft text-accent" },
  { icon: ShoppingBasket, title: "One grocery list", body: "Planned meals merged into one list, grouped by aisle.", tint: "bg-protein/10 text-protein" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2 lg:items-center lg:px-12">
      <section className="hidden lg:block">
        <Logo withTagline />
        <h1 className="headline-xl mt-8">The recipe ledger for how you actually cook.</h1>
        <ul className="mt-8 space-y-3">
          {features.map((f) => (
            <li key={f.title} className="flex gap-4 rounded-lg border border-border bg-surface p-4">
              <span className={`grid size-11 shrink-0 place-items-center rounded-md ${f.tint}`}><f.icon className="size-5" aria-hidden /></span>
              <span><span className="block font-semibold">{f.title}</span><span className="text-ink-muted">{f.body}</span></span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center lg:hidden"><Logo className="justify-center" /></div>
        {children}
        <p className="mt-8 text-center text-sm text-ink-muted">No ads. Your recipes stay yours.</p>
      </section>
    </main>
  );
}
