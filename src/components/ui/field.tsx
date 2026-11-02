import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border border-border bg-surface px-4 text-base text-ink placeholder:text-ink-muted transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 py-3", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(control, "h-12 pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-ink", className)} {...props} />;
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string | null; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="mt-1 text-sm text-ink-muted">{hint}</p> : null}
      {error ? <p className="mt-1 text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn("size-[22px] shrink-0 cursor-pointer appearance-none rounded-[6px] border-[1.5px] border-ink-muted bg-surface checked:border-primary checked:bg-primary checked:bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3'%3E%3Cpath d='M5 12l5 5L20 7'/%3E%3C/svg%3E\")] bg-center bg-no-repeat", className)}
      {...props}
    />
  );
}
