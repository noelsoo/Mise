import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { BottomNav, Sidebar } from "@/components/shell/nav";
import { getProfile, requireUser } from "@/lib/supabase/server";
import { RegisterServiceWorker } from "@/components/shell/register-sw";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireUser();
  const profile = await getProfile();
  const path = (await headers()).get("x-pathname") ?? "";
  if (profile && !profile.onboarded && !path.startsWith("/onboarding")) {
    // Onboarding is skippable, so only redirect from the landing page.
    if (path === "/recipes") redirect("/onboarding");
  }
  const { data: books } = await supabase.from("cookbooks").select("id, name, cookbook_recipes(count)").order("name");
  const cookbooks = (books ?? []).map((b) => ({ id: b.id, name: b.name, count: (b.cookbook_recipes as unknown as { count: number }[])[0]?.count ?? 0 }));
  return (
    <div className="flex min-h-dvh">
      <Sidebar cookbooks={cookbooks} />
      <main id="main" className="min-w-0 flex-1 pb-28 lg:pb-12">{children}</main>
      <BottomNav />
      <RegisterServiceWorker />
    </div>
  );
}
