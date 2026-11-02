import { Container } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <Container>
      <Skeleton className="h-4 w-40" /><Skeleton className="mt-3 h-10 w-2/3" /><Skeleton className="mt-6 h-12 w-full" />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5]" />)}</div>
    </Container>
  );
}
