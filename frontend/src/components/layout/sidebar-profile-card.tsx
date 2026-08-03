"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GearSix } from "@phosphor-icons/react";
import { useAuthStore } from "@/store/auth-store";
import { userInitials } from "@/lib/user-display";
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

  return (
    <Link
      href="/parametres"
      onClick={onNavigate}
      title="Parametres"
      className={cn("group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40", className)}
    >
      <motion.div
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 transition-colors group-hover:border-emerald-500/25 group-hover:bg-white/[0.07]"
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xs font-semibold text-emerald-300">
          {userInitials(user?.email, user?.first_name, user?.last_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user?.email}</p>
          <p className="text-xs text-zinc-500">{roleLabel}</p>
        </div>
        <GearSix
          className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-emerald-400/90"
          weight="duotone"
        />
      </motion.div>
    </Link>
  );
}
