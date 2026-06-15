"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle,
  FolderOpen,
  ShareNetwork,
  Star,
  Trash,
} from "@phosphor-icons/react";
import type { DashboardStats } from "@/services/dashboard.service";
import { ARCHIFLOW_PLUS } from "@/lib/branding";
import { DashboardLiveStatus } from "./dashboard-live-status";
import { DashboardMetricStream } from "./dashboard-metric-stream";
import { DashboardQuickAccess } from "./dashboard-quick-access";

type MetricTileProps = {
  label: string;
  value: number;
  href: string;
  action: string;
  icon: React.ReactNode;
  index: number;
  large?: boolean;
};

function MetricTile({
  label,
  value,
  href,
  action,
  icon,
  index,
  large,
}: MetricTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 20,
        delay: index * 0.06,
      }}
      className={`flex flex-col gap-3 ${large ? "md:col-span-2" : ""}`}
    >
      <p className="px-1 text-sm font-semibold tracking-tight text-zinc-800">
        {label}
      </p>
      <Link
        href={href}
        className="group surface-bento flex min-h-[11rem] flex-col justify-between p-8 transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <motion.div
          className="flex items-start justify-between gap-4"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
        >
          <motion.div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700">
            {icon}
          </motion.div>
          <ArrowRight
            className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600"
            weight="bold"
          />
        </motion.div>
        <motion.div layout className="mt-8 space-y-1">
          <p className="font-mono text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
            {value}
          </p>
          <p className="text-sm font-medium text-emerald-700">{action}</p>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <motion.div
      className="grid gap-6 md:grid-cols-[2fr_1fr_1fr]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div className="surface-bento h-56 animate-shimmer md:col-span-2" />
      <motion.div className="surface-bento h-56 animate-shimmer" />
      <motion.div className="surface-bento h-56 animate-shimmer md:col-span-2" />
      <motion.div className="surface-bento h-56 animate-shimmer" />
    </motion.div>
  );
}

type DashboardViewProps = {
  stats: DashboardStats | null;
  loading: boolean;
};

export const DashboardView = memo(function DashboardView({
  stats,
  loading,
}: DashboardViewProps) {
  const [greeting, setGreeting] = useState("Bonjour");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 18) setGreeting("Bonsoir");
    else if (hour >= 12) setGreeting("Bon apres-midi");
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
    s.documents === 0 &&
    s.workflows_pending === 0 &&
    s.workflows_in_progress === 0 &&
    s.documents_shared === 0 &&
    s.notifications_unread === 0 &&
    s.favorites === 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-10 px-0 py-2 md:pl-4 lg:pl-8">
      <motion.section
        className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <motion.div className="space-y-4 lg:pr-12">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">
            ArchiFlow v3
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tighter text-zinc-900 md:text-5xl">
            {greeting}, votre espace documentaire est pret.
          </h1>
          <p className="max-w-[65ch] text-base leading-relaxed text-zinc-600">
            Pilotez vos documents, workflows d&apos;approbation et {ARCHIFLOW_PLUS} depuis
            un tableau de bord concu pour la gestion electronique.
          </p>
        </motion.div>
        <motion.div
          className="glass-panel relative overflow-hidden rounded-[2.5rem] p-8"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
          <p className="text-sm font-semibold text-zinc-700">
            En attente de validation
          </p>
          <p className="mt-2 font-mono text-5xl font-semibold tracking-tight text-zinc-900">
            {s.workflows_pending}
          </p>
          <Link
            href="/workflows/approbations"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
          >
            Traiter les approbations
            <ArrowRight className="h-4 w-4" weight="bold" />
          </Link>
        </motion.div>
      </motion.section>

      <DashboardQuickAccess />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <motion.section
          className="grid gap-x-6 gap-y-10 md:grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr]"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
          initial="hidden"
          animate="show"
        >
          <MetricTile
            index={0}
            large
            label="Mes documents"
            value={s.documents}
            href="/mes-documents"
            action="Parcourir le coffre"
            icon={<FolderOpen className="h-6 w-6" weight="duotone" />}
          />
          <MetricTile
            index={1}
            label="Approbations"
            value={s.workflows_pending}
            href="/workflows/approbations"
            action="Repondre maintenant"
            icon={<CheckCircle className="h-6 w-6" weight="duotone" />}
          />
          <MetricTile
            index={2}
            label="Workflows actifs"
            value={s.workflows_in_progress}
            href="/workflows/en-cours"
            action="Suivre l'avancement"
            icon={<ArrowRight className="h-6 w-6" weight="duotone" />}
          />
          <MetricTile
            index={3}
            label="Partages recus"
            value={s.documents_shared}
            href="/documents-partages"
            action="Consulter"
            icon={<ShareNetwork className="h-6 w-6" weight="duotone" />}
          />
          <MetricTile
            index={4}
            label="Favoris"
            value={s.favorites}
            href="/favoris"
            action="Retrouver rapidement"
            icon={<Star className="h-6 w-6" weight="duotone" />}
          />
          <MetricTile
            index={5}
            label="Corbeille"
            value={s.trash}
            href="/corbeille"
            action="Restaurer ou purger"
            icon={<Trash className="h-6 w-6" weight="duotone" />}
          />
          <MetricTile
            index={6}
            label="Notifications"
            value={s.notifications_unread}
            href="/notifications"
            action="Lire les alertes"
            icon={<Bell className="h-6 w-6" weight="duotone" />}
          />
        </motion.section>
      )}

      {isEmpty && (
        <motion.section
          className="surface-bento flex flex-col gap-3 p-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <p className="text-sm font-medium text-zinc-900">Espace encore vide</p>
          <p className="max-w-[65ch] text-sm text-zinc-600">
            Commencez par importer premier document, puis lancez workflow de validation.
            Plateforme affichera automatiquement activite, approbations et alertes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/importer"
              className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Importer premier document
            </Link>
            <Link
              href="/workflows"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-emerald-200 hover:text-emerald-700"
            >
              Ouvrir workflows
            </Link>
          </div>
        </motion.section>
      )}

      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <motion.div className="flex flex-col gap-3">
          <div className="px-1">
            <p className="text-sm font-semibold text-zinc-800">Metriques plateforme</p>
            <p className="mt-0.5 text-sm text-zinc-600">Indicateurs en temps reel</p>
          </div>
          <DashboardMetricStream />
        </motion.div>
        <div className="flex flex-col gap-3">
          <div className="px-1">
            <p className="text-sm font-semibold text-zinc-800">Suivi des dossiers</p>
            <p className="mt-0.5 text-sm text-zinc-600">Activite documentaire recente</p>
          </div>
          <motion.div
            className="surface-bento p-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.15 }}
          >
            <DashboardLiveStatus />
          </motion.div>
        </div>
      </section>
    </div>
  );
});
