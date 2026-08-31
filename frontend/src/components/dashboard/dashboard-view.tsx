"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  FolderOpen,
  HardDrives,
  ShareNetwork,
  Warning,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import type { DashboardStats } from "@/services/dashboard.service";
import { DashboardLiveStatus } from "./dashboard-live-status";
import { DashboardQuickAccess } from "./dashboard-quick-access";
import { EmptyDocs, ErrorState, SkeletonStats } from "@/components/states";
import { getLastCorrelationId } from "@/lib/api";
import { cn } from "@/lib/utils";

type DashboardViewProps = {
  stats: DashboardStats | null;
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
};

export const DashboardView = memo(function DashboardView({
  stats,
  loading,
  error,
  onRetry,
}: DashboardViewProps) {
  const router = useRouter();
  const [greeting, setGreeting] = useState("Bonjour");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 18) setGreeting("Bonsoir");
    else if (hour >= 12) setGreeting("Bon après-midi");
    else setGreeting("Bonjour");
  }, []);

  const s = stats ?? {
    documents: 0,
    trash: 0,
    workflows_pending: 0,
    workflows_in_progress: 0,
    documents_shared: 0,
    favorites: 0,
    notifications_unread: 0,
  };

  const isEmpty =
    !loading &&
    !error &&
    s.documents === 0 &&
    s.workflows_pending === 0 &&
    s.workflows_in_progress === 0 &&
    s.documents_shared === 0 &&
    s.notifications_unread === 0 &&
    s.favorites === 0;

  const cards = [
    {
      icon: FolderOpen,
      label: "Documents",
      value: String(s.documents),
      sub: "dans votre coffre",
      href: "/mes-documents",
      tone: "bg-amber-50 text-amber-600",
    },
    {
      icon: Warning,
      label: "En attente",
      value: String(s.workflows_pending),
      sub: "approbations à traiter",
      href: "/workflows/approbations",
      tone: "bg-amber-50 text-amber-600",
    },
    {
      icon: ShareNetwork,
      label: "Partagés",
      value: String(s.documents_shared),
      sub: "avec votre équipe",
      href: "/documents-partages",
      tone: "bg-sky-50 text-sky-600",
    },
    {
      icon: HardDrives,
      label: "Notifications",
      value: String(s.notifications_unread),
      sub: "non lues",
      href: "/notifications",
      tone: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          {greeting}. Voici l’état de votre coffre.
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Documents, approbations et partages — toujours clair sur ce qui se passe.
        </p>
      </div>

      {loading && <SkeletonStats />}

      {error && (
        <ErrorState
          title="Impossible de charger le tableau de bord"
          correlationId={getLastCorrelationId()}
          onRetry={() => onRetry?.()}
        />
      )}

      {!loading && !error && isEmpty && (
        <EmptyDocs onImport={() => router.push("/importer")} />
      )}

      {!loading && !error && !isEmpty && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3), ease: "easeOut" }}
              >
                <Link href={card.href} className="block rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", card.tone)}>
                      <card.icon className="h-4 w-4" weight="duotone" />
                    </span>
                    <p className="text-xs font-medium text-zinc-500">{card.label}</p>
                  </div>
                  <p className="tnum mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">{card.sub}</p>
                </Link>
              </motion.div>
            ))}
          </div>

          <DashboardQuickAccess />

          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900">Suivi des dossiers</p>
            </div>
            <DashboardLiveStatus />
          </section>
        </motion.div>
      )}
    </div>
  );
});
