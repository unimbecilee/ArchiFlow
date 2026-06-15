"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MENU_ARCHIFLOW } from "@/config/menu-archiflow";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/notification-context";
import { useAuthStore } from "@/store/auth-store";

function userInitials(email?: string) {
  if (!email) return "AF";
  const local = email.split("@")[0] ?? "AF";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function ArchiFlowSidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unread, unreadShares } = useNotifications();
  const isAdmin = user?.role === "admin";
  const canWrite = user?.capabilities?.write_documents !== false;

  const canSeeItem = (item: (typeof MENU_ARCHIFLOW)[number]["items"][number]) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.requiresWrite && !canWrite) return false;
    return true;
  };

  return (
    <aside className="relative hidden w-[17.5rem] shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950 text-zinc-300 md:flex">
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(16,185,129,0.18), transparent 42%), radial-gradient(circle at 80% 100%, rgba(255,255,255,0.04), transparent 35%)",
        }}
      />

      <motion.div
        className="relative border-b border-white/10 px-6 py-7"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="flex items-center gap-3">
          <motion.div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
            AF
          </motion.div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Archi<span className="text-emerald-400">Flow</span>
            </h1>
            <p className="text-xs text-zinc-500">GED &amp; workflows</p>
          </div>
        </div>
      </motion.div>

      <nav className="relative flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {MENU_ARCHIFLOW.map((section, idx) => {
          const items = section.items.filter((item) => canSeeItem(item));
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

      <div className="relative border-t border-white/10 px-6 py-5">
        <motion.div
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-xs font-semibold text-emerald-300">
            {userInitials(user?.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.email}</p>
            <p className="text-xs capitalize text-zinc-500">{user?.role ?? "utilisateur"}</p>
          </div>
        </motion.div>
        <p className="mt-4 text-center text-[11px] text-zinc-600">ArchiFlow v3</p>
      </div>
    </aside>
  );
}
