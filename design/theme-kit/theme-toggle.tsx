"use client";

import { MonitorSmartphone, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Clair", Icon: Sun },
  { value: "dark", label: "Sombre", Icon: Moon },
  { value: "system", label: "Système", Icon: MonitorSmartphone },
] as const;

/**
 * Sélecteur de thème 3 positions, accessible, sans flash d'hydratation.
 * - aria-pressed sur chaque bouton, rôle group + label explicite
 * - l'indicateur glisse (transition CSS, pas de JS par frame)
 * - rendu neutre tant que le thème n'est pas connu (évite le mismatch SSR)
 */
export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeIndex = Math.max(
    0,
    OPTIONS.findIndex((o) => o.value === theme),
  );

  if (compact) {
    const isDark = theme === "dark";
    return (
      <button
        type="button"
        aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
        data-theme-toggle
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-lg",
          "text-muted-foreground transition-colors duration-150",
          "hover:bg-accent hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          className,
        )}
      >
        {mounted && isDark ? (
          <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />
        ) : (
          <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        )}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Thème de l'interface"
      data-theme-toggle
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5",
        className,
      )}
    >
      {/* indicateur glissant */}
      <span
        aria-hidden="true"
        className="absolute left-0.5 top-0.5 h-[calc(100%-4px)] w-[calc((100%-4px)/3)] rounded-md bg-accent-soft transition-transform duration-200 ease-flow"
        style={{ transform: `translateX(${mounted ? activeIndex * 100 : 0}%)` }}
      />
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={`Thème ${label.toLowerCase()}`}
            onClick={() => setTheme(value)}
            className={cn(
              "relative z-10 inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5",
              "text-xs font-medium transition-colors duration-150",
              active
                ? "text-accent-soft-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
