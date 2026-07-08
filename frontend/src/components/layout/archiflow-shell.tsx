"use client";

import Link from "next/link";
import { Bell, SignOut } from "@phosphor-icons/react";
import { ArchiFlowSidebar } from "./archiflow-sidebar";
import { useAuthStore } from "@/store/auth-store";
import { useNotifications } from "@/context/notification-context";
import { NotificationProvider } from "@/context/notification-context";

type ArchiFlowShellProps = {
  children: React.ReactNode;
  title?: string;
};

function userInitials(email?: string) {
  if (!email) return "AF";
  const local = email.split("@")[0] ?? "AF";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function ShellInner({ children, title = "Dashboard" }: ArchiFlowShellProps) {
  const { user, logout } = useAuthStore();
  const { unread } = useNotifications();

  return (
    <div className="flex min-h-[100dvh] w-full bg-[#f9fafb]">
      <ArchiFlowSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 glass-panel px-4 py-4 sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">
                Espace connecte
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                {title}
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/notifications"
                className="relative rounded-xl border border-slate-200/80 bg-white p-2.5 text-zinc-600 transition-all hover:border-emerald-200 hover:text-emerald-700 active:scale-[0.98]"
                title="Notifications"
              >
                <Bell className="h-5 w-5" weight="regular" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[1rem] rounded-full bg-emerald-600 px-1 text-center text-[10px] font-bold text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <div className="hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-emerald-300">
                  {userInitials(user?.email)}
                </div>
                <span className="max-w-[220px] truncate text-sm text-zinc-600">
                  {user?.email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98] sm:text-sm"
              >
                <SignOut className="h-4 w-4" weight="bold" />
                <span className="hidden sm:inline">Deconnexion</span>
              </button>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1 overflow-x-hidden px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200/70 bg-white/70 px-4 py-4 text-center text-xs text-zinc-500 backdrop-blur-sm">
          2026 ArchiFlow — Gestion electronique de documents
        </footer>
      </div>
    </div>
  );
}

export function ArchiFlowShell(props: ArchiFlowShellProps) {
  return (
    <NotificationProvider>
      <ShellInner {...props} />
    </NotificationProvider>
  );
}
