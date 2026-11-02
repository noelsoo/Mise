import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { Container } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { completeOnboarding, skipOnboarding } from "@/lib/actions/profile";
import { getProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set up your kitchen" };

export default async function OnboardingPage() {
  const profile = await getProfile();
  if (!profile) return null;
  return (
    <Container className="max-w-xl">
      <p className="label-caps text-primary">Kitchen setup</p>
      <h1 className="headline-xl mt-2">Set up your kitchen</h1>
      <p className="mt-2 text-ink-muted">Units, the day your week starts and, if you like, daily calorie and macro targets. You can change these any time under Me.</p>
      <div className="mt-6"><ProfileForm profile={profile} action={completeOnboarding} submitLabel="Save and start" onboarding /></div>
      <form action={skipOnboarding} className="mt-3"><Button variant="quiet" className="w-full" type="submit">Skip for now</Button></form>
    </Container>
  );
}
