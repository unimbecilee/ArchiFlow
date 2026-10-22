"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  CaretRight,
  MagnifyingGlass,
  UploadSimple,
} from "@phosphor-icons/react";
import { ArchiFlowSidebar } from "./archiflow-sidebar";
import { AppDecor } from "@/components/backgrounds";
import { ThemeToggle } from "@/components/theme-toggle";
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

  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.platform)) setSearchMod("⌘");
  }, []);

  return (
    <div className="relative flex min-h-[100dvh] w-full bg-background">
      <AppDecor />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-e2 focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        Aller au contenu principal
      </a>
      <ArchiFlowSidebar />
      <NavCommandPalette open={navOpen} onOpenChange={setNavOpen} />
      <MobileNavMenuPanel
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
      />

      <div className="relative flex min-h-[100dvh] min-w-0 flex-1 flex-col lg:pl-64">
        <div className="relative flex min-h-[100dvh] min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:gap-4 sm:px-5">
            <MobileNavMenuButton onClick={() => setMobileMenuOpen(true)} />

            {nestedCrumbs && (
              <nav
                className="hidden min-w-0 max-w-[14rem] items-center gap-1.5 text-[13px] lg:flex"
                aria-label="Fil d'ariane"
              >
                {pageMeta.crumbs.map((c, i) => (
                  <span
                    key={`${c.href ?? c.label}-${i}`}
                    className="flex min-w-0 items-center gap-1.5"
                  >
                    {c.href && i < pageMeta.crumbs.length - 1 ? (
                      <Link
                        href={c.href}
                        className="truncate text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {c.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          "truncate",
                          i === pageMeta.crumbs.length - 1
                            ? "font-medium text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {c.label}
                      </span>
                    )}
                    {i < pageMeta.crumbs.length - 1 && (
                      <CaretRight className="h-3 w-3 shrink-0 text-subtle-foreground" />
                    )}
                  </span>
                ))}
              </nav>
            )}

            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="mx-auto flex h-9 min-w-0 w-full max-w-[560px] items-center gap-2.5 rounded-md border border-border bg-card/70 px-3.5 text-sm text-muted-foreground shadow-e1 transition-all duration-150 hover:border-border-strong hover:bg-card"
            >
              <MagnifyingGlass
                className="h-4 w-4 shrink-0 text-subtle-foreground"
                weight="bold"
              />
              <span className="min-w-0 flex-1 truncate text-left text-[13px]">
                Rechercher un document ou une page...
              </span>
              <kbd className="hidden shrink-0 items-center gap-1 rounded border border-border bg-muted px-1.5 py-1 text-[10px] font-medium leading-none text-muted-foreground sm:inline-flex">
                <span className="text-[11px]">{searchMod}</span> K
              </kbd>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle compact />
              <Link
                href="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors duration-150 hover:border-border hover:bg-accent hover:text-foreground"
                aria-label={
                  unread > 0
                    ? `${unread} notification${unread > 1 ? "s" : ""}`
                    : "Notifications"
                }
              >
                <Bell
                  className="h-[18px] w-[18px]"
                  weight={unread > 0 ? "fill" : "regular"}
                />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-primary-foreground shadow-e1 ring-2 ring-background">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <div
                className="mx-0.5 hidden h-6 w-px bg-border sm:block"
                aria-hidden
              />
              <Link
                href="/parametres/compte"
                className="ml-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground ring-2 ring-background transition-colors hover:bg-primary-hover sm:h-9 sm:w-9"
                aria-label="Mon compte"
              >
                {userInitials(user?.email, user?.first_name, user?.last_name)}
              </Link>
            </div>
          </header>

          <main
            id="main"
            className="relative z-10 mx-auto w-full max-w-[1400px] min-w-0 flex-1 px-4 py-6 pb-20 sm:px-6 lg:px-8"
          >
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
