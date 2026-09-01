"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, CaretRight, MagnifyingGlass, Moon, Sun, UploadSimple } from "@phosphor-icons/react";
import { ArchiFlowSidebar } from "./archiflow-sidebar";
import { AppBackgroundLight } from "@/components/backgrounds";
import { useTheme } from "@/hooks/use-theme";
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
import { userInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";

type ArchiFlowShellProps = {
  children: React.ReactNode;
  title?: string;
};

function ShellInner({ children }: ArchiFlowShellProps) {
  const pathname = usePathname();
  const pageMeta = resolvePageMeta(pathname);
  const { user } = useAuthStore();
  const { unread } = useNotifications();
  const { open: navOpen, setOpen: setNavOpen } = useNavCommandPalette();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchMod, setSearchMod] = useState("Ctrl");
  const nestedCrumbs = pageMeta.crumbs.length > 1;
  const { resolved, setTheme } = useTheme();

  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.platform)) setSearchMod("⌘");
  }, []);

  return (
    <div className="relative flex min-h-[100dvh] w-full bg-[#f6f7f9] dark:bg-zinc-950">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        Aller au contenu principal
      </a>
      <ArchiFlowSidebar />
      <NavCommandPalette open={navOpen} onOpenChange={setNavOpen} />
      <MobileNavMenuPanel open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

      <div className="relative flex min-h-[100dvh] min-w-0 flex-1 flex-col lg:pl-64">
        <div className="relative flex min-h-[100dvh] min-w-0 flex-1 flex-col">
          <AppBackgroundLight />
          <header className="sticky top-0 z-20 flex h-[56px] items-center gap-3 border-b border-zinc-200/70 bg-white/90 px-3 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/80 dark:supports-[backdrop-filter]:bg-zinc-900/70 sm:gap-4 sm:px-5">
            <MobileNavMenuButton onClick={() => setMobileMenuOpen(true)} />

            {nestedCrumbs && (
              <nav
                className="hidden min-w-0 max-w-[14rem] items-center gap-1.5 text-[13px] lg:flex"
                aria-label="Fil d’Ariane"
              >
                {pageMeta.crumbs.map((c, i) => (
                  <span key={`${c.href ?? c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
                    {c.href && i < pageMeta.crumbs.length - 1 ? (
                      <Link href={c.href} className="truncate text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                        {c.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          "truncate",
                          i === pageMeta.crumbs.length - 1 ? "font-medium text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"
                        )}
                      >
                        {c.label}
                      </span>
                    )}
                    {i < pageMeta.crumbs.length - 1 && (
                      <CaretRight className="h-3 w-3 shrink-0 text-zinc-300 dark:text-zinc-600" />
                    )}
                  </span>
                ))}
              </nav>
            )}

            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="mx-auto flex h-9 min-w-0 w-full max-w-[560px] items-center gap-2.5 rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-3.5 text-sm text-zinc-500 shadow-sm transition-all hover:border-zinc-300 hover:bg-white hover:shadow dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              <MagnifyingGlass className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" weight="bold" />
              <span className="min-w-0 flex-1 truncate text-left text-[13px]">
                Rechercher un document ou une page…
              </span>
              <kbd className="hidden shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-[10px] font-medium leading-none text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 sm:inline-flex">
                <span className="text-[11px]">{searchMod}</span> K
              </kbd>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-zinc-500 transition-colors hover:border-zinc-200 hover:bg-white hover:text-zinc-800 hover:shadow-sm dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label={resolved === "dark" ? "Passer en clair" : "Passer en sombre"}
                title={resolved === "dark" ? "Mode clair" : "Mode sombre"}
              >
                {resolved === "dark" ? <Sun className="h-[18px] w-[18px]" weight="duotone" /> : <Moon className="h-[18px] w-[18px]" weight="duotone" />}
              </button>
              <Link
                href="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-zinc-500 transition-colors hover:border-zinc-200 hover:bg-white hover:text-zinc-800 hover:shadow-sm dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label={unread > 0 ? `${unread} notification${unread > 1 ? "s" : ""}` : "Notifications"}
              >
                <Bell className="h-[18px] w-[18px]" weight={unread > 0 ? "fill" : "regular"} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[11px] font-semibold leading-none text-white shadow-sm ring-2 ring-white dark:ring-zinc-900">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <div className="mx-0.5 hidden h-6 w-px bg-zinc-200 dark:bg-zinc-700 sm:block" aria-hidden />
              <Link
                href="/importer"
                className="ml-1 hidden h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-[13px] font-medium text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-500 sm:inline-flex"
              >
                <UploadSimple className="h-3.5 w-3.5" weight="bold" />
                Importer
              </Link>
              <Link
                href="/parametres/compte"
                className="ml-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white ring-2 ring-white transition-colors hover:bg-zinc-800 dark:bg-zinc-800 dark:ring-zinc-900 sm:h-9 sm:w-9"
                aria-label="Mon compte"
              >
                {userInitials(user?.email, user?.first_name, user?.last_name)}
              </Link>
            </div>
          </header>

          <main id="main" className="relative z-10 min-w-0 flex-1 px-4 py-5 pb-20 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
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
