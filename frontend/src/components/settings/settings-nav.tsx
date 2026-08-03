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
      className="rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
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
                    ? "bg-emerald-500/10 font-medium text-emerald-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", active ? "text-emerald-700" : "text-zinc-400")}
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
