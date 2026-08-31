"use client";

import Link from "next/link";
import { GearSix } from "@phosphor-icons/react";
import { useAuthStore } from "@/store/auth-store";
import { userDisplayName, userInitials } from "@/lib/user-display";
import { ROLE_LABELS, type PlatformRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type SidebarProfileCardProps = {
  onNavigate?: () => void;
  className?: string;
};

export function SidebarProfileCard({ onNavigate, className }: SidebarProfileCardProps) {
  const { user } = useAuthStore();
  const roleKey = user?.role as PlatformRole | undefined;
  const roleLabel =
    roleKey && ROLE_LABELS[roleKey] ? ROLE_LABELS[roleKey] : user?.role ?? "Utilisateur";
  const name = userDisplayName(user?.email, user?.first_name, user?.last_name);

  return (
    <Link
      href="/parametres/compte"
      onClick={onNavigate}
      aria-label="Paramètres du compte"
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2 outline-none hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-500/60",
        className
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
        {userInitials(user?.email, user?.first_name, user?.last_name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white">{name}</p>
        <p className="text-[11px] text-zinc-500">{roleLabel}</p>
      </div>
      <GearSix className="h-4 w-4 shrink-0 text-zinc-500" weight="regular" />
    </Link>
  );
}
