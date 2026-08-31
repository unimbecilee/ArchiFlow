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
  indicatorId?: string;
};

export function ArchiFlowSidebarNav({
  onNavigate,
  className,
  indicatorId = "nav",
}: ArchiFlowSidebarNavProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unread, unreadShares } = useNotifications();
  const menuCtx = buildMenuAccessContext(user);

  return (
    <nav className={cn("space-y-6", className)} aria-label="Navigation principale">
      {MENU_ARCHIFLOW.map((section, idx) => {
        const items = section.items.filter((item) => canSeeMenuItem(item, menuCtx));
        if (items.length === 0) return null;
        return (
          <div key={idx}>
            {section.heading && (
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {section.heading}
              </p>
            )}
            <ul className="space-y-0.5">
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
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId={`nav-indicator-${indicatorId}`}
                          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-emerald-400"
                        />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"
                        )}
                        weight={active ? "fill" : "regular"}
                      />
                      <span className="flex-1">{item.title}</span>
                      {badgeCount > 0 && (
                        <span className="tnum min-w-[1.25rem] rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-center text-[10px] font-semibold text-emerald-300">
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
