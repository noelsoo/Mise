import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "./slot";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0 min-h-11",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-hover",
        accent: "bg-accent text-white shadow-2 hover:brightness-95",
        ghost: "border border-border bg-transparent text-ink hover:bg-surface-muted",
        quiet: "text-ink hover:bg-surface-muted",
        danger: "bg-danger text-white hover:brightness-95",
        link: "min-h-0 px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        md: "px-5 py-3",
        sm: "px-3 py-2",
        icon: "size-11 p-0",
        lg: "px-6 py-3.5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
