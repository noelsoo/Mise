import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/shell/page-header";
import { CustomFoods } from "@/components/custom-foods";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Custom foods" };

export default async function FoodsPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("custom_foods").select("*").order("name");
  return (
    <Container className="max-w-3xl">
      <PageHeader eyebrow="Nutrition" title="Custom foods" />
      <div className="mt-6"><CustomFoods foods={data ?? []} /></div>
    </Container>
  );
}
