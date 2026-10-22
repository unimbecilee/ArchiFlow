"use client";

import Link from "next/link";
import { GearSix, SignOut } from "@phosphor-icons/react";
import { useAuthStore } from "@/store/auth-store";
import { userDisplayName, userInitials } from "@/lib/user-display";
import { ROLE_LABELS, type PlatformRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type SidebarProfileCardProps = {
  onNavigate?: () => void;
  className?: string;
};

export function SidebarProfileCard({
  onNavigate,
  className,
}: SidebarProfileCardProps) {
  const { user, logout } = useAuthStore();
  const roleKey = user?.role as PlatformRole | undefined;
  const roleLabel =
    roleKey && ROLE_LABELS[roleKey]
      ? ROLE_LABELS[roleKey]
      : (user?.role ?? "Utilisateur");
  const name = userDisplayName(user?.email, user?.first_name, user?.last_name);

  return (
    <div
      className={cn("flex items-center gap-1 rounded-lg px-1 py-1", className)}
    >
      <Link
        href="/parametres/compte"
        onClick={onNavigate}
        aria-label="Paramètres du compte"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-brand/60"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-brand text-[11px] font-semibold text-sidebar-active-foreground">
          {userInitials(user?.email, user?.first_name, user?.last_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-sidebar-foreground">
            {name}
          </p>
          <p className="text-[11px] text-sidebar-muted">{roleLabel}</p>
        </div>
        <GearSix
          className="h-4 w-4 shrink-0 text-sidebar-muted"
          weight="regular"
        />
      </Link>
      <button
        type="button"
        onClick={() => logout()}
        className="rounded-md p-2 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        aria-label="Se déconnecter"
      >
        <SignOut className="h-4 w-4" />
      </button>
    </div>
  );
}
