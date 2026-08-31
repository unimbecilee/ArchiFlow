"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildSettingsAccessContext, listVisibleSettingsNav } from "@/lib/settings-access";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

export function SettingsNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const items = listVisibleSettingsNav(buildSettingsAccessContext(user));

  return (
    <nav
      className="surface-card p-2"
      aria-label="Sections parametres"
    >
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <Link
                href={item.path}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                  weight={active ? "fill" : "regular"}
                />
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
