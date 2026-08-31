"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, CaretRight, House, MagnifyingGlass, SignOut } from "@phosphor-icons/react";
import { ArchiFlowSidebar } from "./archiflow-sidebar";
import { ConfirmProvider } from "@/components/feedback/confirm-provider";
import {
  NavCommandPalette,
  useNavCommandPalette,
} from "@/components/navigation/nav-command-palette";
import { MobileNavMenuButton, MobileNavMenuPanel } from "./mobile-nav-drawer";
import { ImportFab } from "./import-fab";
import { useAuthStore } from "@/store/auth-store";
import { useNotifications } from "@/context/notification-context";
import { NotificationProvider } from "@/context/notification-context";
import { resolvePageMeta } from "@/lib/page-meta";
import { userDisplayName, userInitials } from "@/lib/user-display";
import { ROLE_LABELS, type PlatformRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type ArchiFlowShellProps = {
  children: React.ReactNode;
  title?: string;
};

function ShellInner({ children }: ArchiFlowShellProps) {
  const pathname = usePathname();
  const pageMeta = resolvePageMeta(pathname);
  const { user, logout } = useAuthStore();
  const { unread } = useNotifications();
  const { open: navOpen, setOpen: setNavOpen } = useNavCommandPalette();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const roleKey = user?.role as PlatformRole | undefined;
  const roleLabel = roleKey && ROLE_LABELS[roleKey] ? ROLE_LABELS[roleKey] : user?.role ?? "Utilisateur";
  const name = userDisplayName(user?.email, user?.first_name, user?.last_name);

  return (
    <div className="flex min-h-[100dvh] w-full bg-[#f6f7f9]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        Aller au contenu principal
      </a>
      <ArchiFlowSidebar />
      <NavCommandPalette open={navOpen} onOpenChange={setNavOpen} />
      <MobileNavMenuPanel open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <MobileNavMenuButton onClick={() => setMobileMenuOpen(true)} />

          <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Fil d’Ariane">
            <House className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <CaretRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
            {pageMeta.crumbs.map((c, i) => (
              <span key={`${c.href ?? c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
                {c.href && i < pageMeta.crumbs.length - 1 ? (
                  <Link href={c.href} className="truncate text-zinc-500 hover:text-zinc-900">
                    {c.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "truncate",
                      i === pageMeta.crumbs.length - 1 ? "font-medium text-zinc-900" : "text-zinc-500"
                    )}
                  >
                    {c.label}
                  </span>
                )}
                {i < pageMeta.crumbs.length - 1 && (
                  <CaretRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
                )}
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="mr-1 hidden h-9 w-[min(100%,18rem)] items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-500 sm:flex"
            >
              <MagnifyingGlass className="h-4 w-4" />
              <span className="flex-1 text-left">Rechercher…</span>
              <kbd className="flex items-center gap-0.5 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium">
                ⌘K
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 sm:hidden"
              aria-label="Rechercher"
            >
              <MagnifyingGlass className="h-5 w-5" />
            </button>
            <Link
              href="/notifications"
              className="relative rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </Link>
            <div className="ml-1 hidden items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                {userInitials(user?.email, user?.first_name, user?.last_name)}
              </div>
              <div className="leading-tight">
                <p className="max-w-[160px] truncate text-[13px] font-medium text-zinc-900">{name}</p>
                <p className="text-[11px] text-zinc-500">{roleLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
              aria-label="Se déconnecter"
            >
              <SignOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <ImportFab />
    </div>
  );
}

export function ArchiFlowShell(props: ArchiFlowShellProps) {
  return (
    <NotificationProvider>
      <ConfirmProvider>
        <ShellInner {...props} />
      </ConfirmProvider>
    </NotificationProvider>
  );
}
