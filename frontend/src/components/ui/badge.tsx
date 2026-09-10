import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        amber: "border-warning/25 bg-warning-soft text-warning-soft-foreground",
        emerald: "border-success/25 bg-success-soft text-success-soft-foreground",
        sky: "border-info/25 bg-info-soft text-info-soft-foreground",
        red: "border-destructive/25 bg-destructive-soft text-destructive-soft-foreground",
        brand: "border-primary/20 bg-accent-soft text-accent-soft-foreground",
        success: "border-success/25 bg-success-soft text-success-soft-foreground",
        warning: "border-warning/25 bg-warning-soft text-warning-soft-foreground",
        info: "border-info/25 bg-info-soft text-info-soft-foreground",
        danger: "border-destructive/25 bg-destructive-soft text-destructive-soft-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
