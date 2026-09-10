import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-input-bg px-3 text-sm text-foreground shadow-sm",
        "hover:border-border-strong",
        "focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
        "disabled:bg-muted disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
