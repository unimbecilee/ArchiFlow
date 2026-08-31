"use client";

import { cn } from "@/lib/utils";

type TabsProps = {
  value: string;
  onValueChange: (v: string) => void;
  tabs: { id: string; label: string }[];
  className?: string;
};

export function Tabs({ value, onValueChange, tabs, className }: TabsProps) {
  return (
    <div
      className={cn("inline-flex flex-wrap gap-1 rounded-2xl bg-muted/80 p-1", className)}
      role="tablist"
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            id={`tab-${t.id}`}
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onValueChange(t.id)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
