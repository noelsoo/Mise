import type { Metadata } from "next";
import { Container } from "@/components/shell/page-header";
import { ImportPanel } from "@/components/import/import-panel";
import { requireUser } from "@/lib/supabase/server";

export const maxDuration = 60;
export const metadata: Metadata = { title: "Add recipe" };

export default async function AddPage() {
  const { user } = await requireUser();
  return (
    <Container className="max-w-3xl">
      <p className="label-caps text-primary">Add recipe</p>
      <h1 className="headline-xl mt-1">Bring a recipe in</h1>
      <p className="mt-2 mb-6 text-ink-muted">From a link, pasted text or a photo. You&apos;ll always see an editable preview before it&apos;s saved.</p>
      <ImportPanel userId={user.id} />
    </Container>
  );
}
