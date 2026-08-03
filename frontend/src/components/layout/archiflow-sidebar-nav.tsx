"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MENU_ARCHIFLOW } from "@/config/menu-archiflow";
import { buildMenuAccessContext, canSeeMenuItem } from "@/lib/menu-access";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/notification-context";
import { useAuthStore } from "@/store/auth-store";

type ArchiFlowSidebarNavProps = {
  onNavigate?: () => void;
  className?: string;
};

export function ArchiFlowSidebarNav({ onNavigate, className }: ArchiFlowSidebarNavProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unread, unreadShares } = useNotifications();
  const menuCtx = buildMenuAccessContext(user);

  return (
    <nav className={cn("space-y-6", className)}>
      {MENU_ARCHIFLOW.map((section, idx) => {
        const items = section.items.filter((item) => canSeeMenuItem(item, menuCtx));
        if (items.length === 0) return null;
        return (
          <div key={idx}>
            {section.heading && (
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {section.heading}
              </p>
            )}
            <ul className="space-y-1">
              {items.map((item) => {
                const active =
                  pathname === item.path ||
                  (item.path !== "/" && pathname.startsWith(item.path));
                const Icon = item.icon;
                const badgeCount =
                  item.path === "/notifications"
                    ? unread
                    : item.path === "/documents-partages"
                      ? unreadShares
                      : 0;
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-300 active:scale-[0.98]",
                        active
                          ? "bg-emerald-500/15 text-white"
                          : "text-zinc-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-2xl border border-emerald-500/20 bg-emerald-500/10"
                          transition={{ type: "spring", stiffness: 180, damping: 22 }}
                        />
                      )}
                      <Icon
                        className="relative h-4 w-4 shrink-0"
                        weight={active ? "fill" : "regular"}
                      />
                      <span className="relative flex-1 font-medium">{item.title}</span>
                      {badgeCount > 0 && (
                        <span
                          className={cn(
                            "relative min-w-[1.35rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold",
                            item.path === "/documents-partages"
                              ? active
                                ? "bg-sky-400 text-zinc-950"
                                : "bg-sky-500 text-white"
                              : active
                                ? "bg-white text-emerald-700"
                                : "bg-emerald-500 text-white"
                          )}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
