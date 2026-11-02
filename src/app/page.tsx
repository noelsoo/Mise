import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Camera, Check, ChefHat, CloudOff, Flame, Link2, Lock,
  PieChart, ShieldCheck, ShoppingBasket, Sprout, Timer, UtensilsCrossed,
} from "lucide-react";
import { LandingNav } from "@/components/landing/landing-nav";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { absolute: "Mise · A mindful recipe ledger for home cooks" },
  description: "Save recipes from links, text or photos, see calories and macros per serving from USDA data, plan the week and shop from one merged grocery list. Free, no ads.",
};

const APP_HREF = "/recipes";

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tnum ${className}`}>{children}</span>;
}

function ProductPreview() {
  return (
    <div className="relative mx-auto mt-14 max-w-5xl rounded-2xl border border-border bg-surface p-3 shadow-3 md:p-4" aria-label="Preview of the Mise app">
      <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-muted">
        <span className="flex gap-1.5" aria-hidden><span className="size-2.5 rounded-full bg-[#e5e2da]" /><span className="size-2.5 rounded-full bg-[#e5e2da]" /><span className="size-2.5 rounded-full bg-[#e5e2da]" /></span>
        <Lock className="ml-2 size-3.5" aria-hidden /> <span className="truncate">mise · recipes / hainanese chicken rice</span>
        <span className="ml-auto hidden rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary sm:inline">Works offline</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="relative grid aspect-[16/9] place-items-center bg-[radial-gradient(circle_at_30%_30%,#e3eee5,transparent_55%),radial-gradient(circle_at_75%_70%,#fbe9e1,transparent_50%),#f1f4ef]">
            <div className="grid size-24 place-items-center rounded-full bg-surface shadow-2"><UtensilsCrossed className="size-10 text-primary" aria-hidden /></div>
            <Pill className="absolute left-3 top-3 bg-surface/90 text-ink"><Sprout className="size-3.5 text-primary" aria-hidden /> Singapore classics</Pill>
            <Pill className="absolute bottom-3 right-3 bg-black/60 text-white"><Timer className="size-3.5" aria-hidden /> 45 min</Pill>
          </div>
          <div className="p-4">
            <h3 className="font-serif text-2xl">Hainanese chicken rice</h3>
            <p className="mt-1 text-sm text-ink-muted">Poached chicken with ginger and pandan, rice cooked in the stock.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill className="bg-accent-soft text-accent"><Flame className="size-3.5" aria-hidden /> 520 kcal</Pill>
              <Pill className="bg-protein/10 text-protein">● Protein 42g</Pill>
              <Pill className="bg-carbs/12 text-carbs-ink">● Carbs 48g</Pill>
              <Pill className="bg-fat/10 text-fat">● Fat 14g</Pill>
            </div>
            <p className="mt-3 text-xs text-ink-muted"><span className="font-semibold text-ink">9 of 9</span> ingredients counted</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-semibold"><ShoppingBasket className="size-4 text-primary" aria-hidden /> Grocery list</p><Pill className="bg-primary-soft text-primary">Merged</Pill></div>
            <ul className="mt-3 divide-y divide-border text-sm">
              {[["Whole chicken", "1.4 kg", true], ["Jasmine rice", "500 g", false], ["Ginger", "50 g + 1 knob", false]].map(([n, q, done]) => (
                <li key={n as string} className="flex items-center gap-3 py-2">
                  <span className={`grid size-5 place-items-center rounded-[6px] border-[1.5px] ${done ? "border-primary bg-primary text-white" : "border-ink-muted"}`} aria-hidden>{done ? <Check className="size-3.5" /> : null}</span>
                  <span className={`flex-1 ${done ? "line-through opacity-50" : ""}`}>{n}</span><span className="text-ink-muted tnum">{q}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="cook-theme rounded-xl bg-canvas p-4 text-ink">
            <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 font-semibold text-primary"><ChefHat className="size-4" aria-hidden /> Cook mode</span><Pill className="bg-accent text-white"><Timer className="size-3.5" aria-hidden /> 24:18</Pill></div>
            <p className="mt-1 text-xs text-ink-muted">Step 3 of 6</p>
            <p className="mt-2 text-lg leading-6">“Lower the chicken into the simmering ginger stock and turn the heat right down.”</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const pillars = [
  {
    n: "01", icon: BookOpen, title: "Save recipes from anywhere",
    body: "Paste a link and Mise reads the recipe data on the page. Paste text from a message, or snap a cookbook page and the text is read on your phone.",
    note: ["No clutter:", "you always get an editable preview first, and photos are kept with the recipe."],
  },
  {
    n: "02", icon: PieChart, title: "Macros you can trust",
    body: "Calories, protein, carbs, fat, fibre, sugar, saturated fat and sodium per serving, from USDA data. Local names like kangkong and kailan are understood.",
    note: ["No guessing:", "anything we can't weigh is shown as uncounted, and totals say “at least”."],
  },
  {
    n: "03", icon: ShoppingBasket, title: "One list for the week",
    body: "Plan your meals, then build a grocery list merged across recipes and grouped by aisle. Staples like salt and oil go under “Probably have”.",
    note: ["Shop offline:", "tick items off in the basement supermarket; ticks sync when you're back online."],
  },
];

export default async function LandingPage() {
  const user = await getUser();
  const cta = user ? "Open Mise" : "Launch web app";
  return (
    <div className="bg-canvas">
      <LandingNav appHref={APP_HREF} signedIn={Boolean(user)} />

      <main id="main">
        {/* Hero */}
        <section className="px-4 pb-16 pt-12 md:px-8 md:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <Pill className="border border-border bg-surface text-ink-muted"><Sprout className="size-3.5 text-primary" aria-hidden /> Singapore edition · Free, no ads</Pill>
            <h1 className="mt-6 font-serif text-[40px] leading-[1.08] tracking-[-0.02em] md:text-[64px]">A mindful recipe ledger for the home cook</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-muted">Keep every recipe you love in one place, see the macros per serving, plan the week and walk into the market with one merged list.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={APP_HREF} className="inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-6 font-semibold text-on-primary shadow-2 hover:bg-primary-hover">{user ? "Open Mise" : "Start your ledger"} <ArrowUpRight className="size-5" aria-hidden /></Link>
              <a href="#cook-mode" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-border bg-surface px-6 font-semibold hover:bg-surface-muted"><ChefHat className="size-5 text-accent" aria-hidden /> See cook mode</a>
            </div>
          </div>
          <ProductPreview />
        </section>

        {/* Methodology */}
        <section id="features" className="scroll-mt-20 border-t border-border bg-surface px-4 py-20 md:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="label-caps text-center text-accent">How Mise works</p>
            <h2 className="mt-3 text-center font-serif text-4xl md:text-5xl">Built like a cookbook, not a food blog</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-ink-muted">No life stories before the ingredients, no pop-ups, no trackers. Just your recipes, honest numbers and a plan for the week.</p>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {pillars.map((p) => (
                <article key={p.n} className="flex flex-col rounded-xl border border-border bg-canvas p-6">
                  <div className="flex items-start justify-between"><span className="font-serif text-3xl text-accent">{p.n}</span><span className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary"><p.icon className="size-5" aria-hidden /></span></div>
                  <h3 className="mt-6 font-sans text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 flex-1 text-ink-muted">{p.body}</p>
                  <p className="mt-5 rounded-md bg-surface px-3 py-2 text-sm"><span className="font-semibold">{p.note[0]}</span> <span className="text-ink-muted">{p.note[1]}</span></p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Plan */}
        <section id="plan" className="scroll-mt-20 px-4 py-20 md:px-8">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="label-caps text-accent">Plan the week</p>
              <h2 className="mt-3 font-serif text-4xl md:text-5xl">Orchestrate the week without chaos</h2>
              <p className="mt-4 text-ink-muted">Breakfast, lunch, dinner and snacks for each day, with your daily calories and macros against the targets you set.</p>
              <ul className="mt-8 space-y-3">
                {[
                  [CalendarDays, "Seven-day meal plan", "Pick a recipe and servings for any slot, or jot a note like “Dinner out”. Copy last week in one tap."],
                  [ShoppingBasket, "List from the plan", "Quantities scale to the servings you planned and merge across recipes: 200 g + 1 cup onion becomes one line."],
                  [CloudOff, "Ready without signal", "This week's plan, your grocery list and recently opened recipes stay available offline."],
                ].map(([Icon, t, b]) => {
                  const I = Icon as typeof CalendarDays;
                  return (
                    <li key={t as string} className="flex gap-4 rounded-xl border border-border bg-surface p-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><I className="size-5" aria-hidden /></span>
                      <span><span className="block font-semibold">{t as string}</span><span className="text-ink-muted">{b as string}</span></span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-2" aria-label="Example weekly plan">
              <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-semibold"><CalendarDays className="size-5 text-primary" aria-hidden /> This week</p><Pill className="bg-primary-soft text-primary">1,740 / 2,000 kcal today</Pill></div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[["Mon", "Laksa lemak", "Protein 34g", "text-protein bg-protein/10"], ["Tue", "Steamed sea bass", "Protein 48g", "text-protein bg-protein/10"], ["Wed", "Sambal kangkong", "Carbs 22g", "text-carbs-ink bg-carbs/12"], ["Thu", "Beef rendang", "Fat 26g", "text-fat bg-fat/10"]].map(([d, r, m, c]) => (
                  <div key={d} className="rounded-lg border border-border bg-canvas p-3">
                    <p className="text-xs font-semibold text-ink-muted">{d}</p><p className="mt-1 font-serif leading-5">{r}</p><Pill className={`mt-2 ${c}`}>● {m}</Pill>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-border">
                <p className="flex items-center justify-between border-b border-border px-4 py-2 text-sm font-semibold"><span>Grocery list · Produce</span><span className="text-ink-muted tnum">2 of 4 ticked</span></p>
                {[["Sea bass fillet", "650 g", true], ["Coconut milk", "400 ml", true], ["Laksa leaves", "2 bunches", false], ["Candlenuts", "100 g", false]].map(([n, q, d]) => (
                  <p key={n as string} className="flex items-center gap-3 border-b border-border px-4 py-2 text-sm last:border-0">
                    <span className={`grid size-5 place-items-center rounded-[6px] border-[1.5px] ${d ? "border-primary bg-primary text-white" : "border-ink-muted"}`} aria-hidden>{d ? <Check className="size-3.5" /> : null}</span>
                    <span className={`flex-1 ${d ? "line-through opacity-50" : ""}`}>{n}</span><span className="text-ink-muted tnum">{q}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Cook mode */}
        <section id="cook-mode" className="cook-theme scroll-mt-20 bg-canvas px-4 py-20 text-ink md:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <Pill className="bg-accent-soft text-accent-ink"><ChefHat className="size-3.5" aria-hidden /> Kitchen counter view</Pill>
              <h2 className="mt-4 font-serif text-4xl md:text-5xl">Hands-off cook mode</h2>
              <p className="mx-auto mt-4 max-w-2xl text-ink-muted">The screen stays awake, each step fills the screen in large type you can read from across the counter, and timers start with one tap.</p>
            </div>
            <div className="mt-10 rounded-2xl border border-border bg-surface p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="label-caps text-primary">Step 4 of 7</p><p className="mt-1 font-serif text-2xl">Sambal aromatics</p></div>
                <div className="flex gap-2"><Pill className="bg-accent text-white"><Timer className="size-3.5" aria-hidden /> Wok 03:45</Pill><Pill className="bg-surface-high text-ink"><Timer className="size-3.5" aria-hidden /> Rice 18:20</Pill></div>
              </div>
              <p className="mt-8 text-[24px] font-medium leading-9 md:text-[28px] md:leading-10">“Fry the pounded shallots and belacan in oil over medium-low heat until the oil separates and the paste turns a deep rust colour, about 8 minutes.”</p>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-surface-high px-5 font-semibold"><ArrowRight className="size-5 rotate-180" aria-hidden /> Back</span>
                <span className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-accent px-5 font-semibold text-white"><Timer className="size-5" aria-hidden /> Start 8 minutes timer</span>
              </div>
            </div>
          </div>
        </section>

        {/* Ways in */}
        <section className="px-4 py-20 md:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="label-caps text-center text-accent">Three ways in</p>
            <h2 className="mt-3 text-center font-serif text-4xl">Bring your recipes with you</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[[Link2, "From a link", "Most recipe sites publish structured recipe data. Mise reads it and copies the photo into your library."], [BookOpen, "From pasted text", "A WhatsApp message from your aunt, a note on your phone, an email. Headings like “Ingredients” help."], [Camera, "From a photo", "Snap a cookbook page or a handwritten card. The text is read on your device, then you check it."]].map(([Icon, t, b]) => {
                const I = Icon as typeof Link2;
                return <article key={t as string} className="rounded-xl border border-border bg-surface p-6"><I className="size-6 text-primary" aria-hidden /><h3 className="mt-4 font-sans text-lg font-semibold">{t as string}</h3><p className="mt-2 text-ink-muted">{b as string}</p></article>;
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-t border-border bg-surface px-4 py-20 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="label-caps text-accent">Honest stewardship</p>
            <h2 className="mt-3 font-serif text-4xl md:text-5xl">Free, with no catch</h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-muted">No banner ads and no selling your eating habits. Export everything as a file whenever you like, or delete your account and all of it goes.</p>
            <div className="mx-auto mt-10 max-w-md rounded-2xl border-2 border-primary bg-canvas p-8 text-left shadow-2">
              <div className="flex items-center justify-between"><h3 className="font-serif text-2xl">The home kitchen</h3><Pill className="bg-primary-soft text-primary">Free</Pill></div>
              <p className="mt-4"><span className="font-serif text-5xl">S$0</span> <span className="text-ink-muted">no card needed</span></p>
              <ul className="mt-6 space-y-3">
                {["Unlimited recipes with photos", "Calories and macros per serving", "Weekly plan and merged grocery list", "Cook mode with timers", "Works offline, syncs across devices", "Export or delete your data any time"].map((f) => (
                  <li key={f} className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />{f}</li>
                ))}
              </ul>
              <Link href={APP_HREF} className="mt-8 flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary font-semibold text-on-primary hover:bg-primary-hover">{cta} <ArrowRight className="size-5" aria-hidden /></Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary px-4 py-20 text-on-primary md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <ShieldCheck className="mx-auto size-10 opacity-80" aria-hidden />
            <h2 className="mt-4 font-serif text-4xl md:text-5xl">Reclaim your kitchen counter from algorithmic clutter</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-90">Your recipes, real numbers and a calm plan for the week.</p>
            <Link href={APP_HREF} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-md bg-accent px-6 font-semibold text-white shadow-3 hover:brightness-95">{cta} <ArrowUpRight className="size-5" aria-hidden /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-12 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p className="flex items-center gap-2 font-serif text-2xl"><span className="grid size-9 place-items-center rounded-lg bg-primary text-on-primary"><Sprout className="size-5" aria-hidden /></span> Mise</p>
            <p className="mt-3 max-w-sm text-sm text-ink-muted">A calm recipe ledger for everyday cooking, macros you can trust and one list for the market.</p>
            <p className="mt-3 text-xs text-ink-muted">Nutrition data: USDA FoodData Central, SR Legacy (public domain).</p>
          </div>
          <nav aria-label="Product"><p className="label-caps text-ink-muted">Product</p><ul className="mt-3 space-y-2 text-sm"><li><a href="#features" className="hover:text-primary">Features</a></li><li><a href="#plan" className="hover:text-primary">Meal plan</a></li><li><a href="#cook-mode" className="hover:text-primary">Cook mode</a></li><li><a href="#pricing" className="hover:text-primary">Pricing</a></li></ul></nav>
          <nav aria-label="Account"><p className="label-caps text-ink-muted">Account</p><ul className="mt-3 space-y-2 text-sm"><li><Link href={APP_HREF} className="hover:text-primary">Open the app</Link></li><li><Link href="/login" className="hover:text-primary">Sign in</Link></li><li><Link href="/signup" className="hover:text-primary">Create an account</Link></li></ul></nav>
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-border pt-6 text-xs text-ink-muted">© {new Date().getFullYear()} Mise. Made for quiet kitchens and fragrant pots.</p>
      </footer>
    </div>
  );
}
