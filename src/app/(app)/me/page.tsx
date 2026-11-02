import type { Metadata } from "next";
import Link from "next/link";
import { Download, LogOut, Salad } from "lucide-react";
import { ProfileForm } from "@/components/profile-form";
import { Container, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteAccount, ThemeToggle } from "@/components/me-controls";
import { signOut } from "@/app/(auth)/actions";
import { updateProfile } from "@/lib/actions/profile";
import { getProfile, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Me" };

export default async function MePage() {
  const { user } = await requireUser();
  const profile = await getProfile();
  if (!profile) return null;
  return (
    <Container className="max-w-2xl">
      <PageHeader eyebrow={user.email ?? undefined} title="Settings" />
      <div className="mt-6 space-y-5">
        <ProfileForm profile={profile} action={updateProfile} submitLabel="Save settings" />
        <Card className="divide-y divide-border">
          <div className="flex items-center justify-between gap-4 p-5"><span><span className="block font-semibold">Appearance</span><span className="text-sm text-ink-muted">Light, dark or follow the system.</span></span><ThemeToggle /></div>
          <Link href="/me/foods" className="flex min-h-16 items-center gap-3 p-5 hover:bg-surface-muted"><Salad className="size-5 text-primary" aria-hidden /><span><span className="block font-semibold">Custom foods</span><span className="text-sm text-ink-muted">Foods you added from packet labels.</span></span></Link>
          <a href="/api/export" download className="flex min-h-16 items-center gap-3 p-5 hover:bg-surface-muted"><Download className="size-5 text-primary" aria-hidden /><span><span className="block font-semibold">Export all my data</span><span className="text-sm text-ink-muted">One JSON file with every recipe, plan, list and setting.</span></span></a>
        </Card>
        <form action={signOut}><Button variant="ghost" className="w-full" type="submit"><LogOut aria-hidden /> Sign out</Button></form>
        <DeleteAccount />
      </div>
    </Container>
  );
}
