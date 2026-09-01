"use client";

import { memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileArchive,
  FileImage,
  FileText,
  FileXls,
  Folder,
  FolderOpen,
  MagnifyingGlass,
  ShareNetwork,
  Star,
  UploadSimple,
  WarningCircle,
  TreeStructure,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { getDashboardStats } from "@/services/dashboard.service";
import { getRecentDocuments } from "@/services/documents.service";
import { getPendingApprovals } from "@/services/workflows.service";
import { EmptyDocs, ErrorState } from "@/components/states";
import { getLastCorrelationId } from "@/lib/api";
import { formatRelativeFr } from "@/lib/format-bytes";
import { FILE_KIND_STYLE, kindFromName, type FileKind } from "@/lib/file-kind";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const KIND_ICON: Record<FileKind, typeof FileText> = {
  folder: Folder,
  pdf: FileText,
  doc: FileText,
  sheet: FileXls,
  image: FileImage,
  archive: FileArchive,
};

function todayLabel() {
  const raw = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bonjour";
  return "Bonsoir";
}

export const DashboardView = memo(function DashboardView() {
  const router = useRouter();
  const { user } = useAuthStore();
  const firstName = user?.first_name?.trim() || user?.email?.split("@")[0] || "";
  const statsQuery = useQuery({ queryKey: ["dashboard-stats"], queryFn: getDashboardStats });
  const recentQuery = useQuery({ queryKey: ["recent-docs-home"], queryFn: getRecentDocuments });
  const pendingQuery = useQuery({
    queryKey: ["pending-approvals-home"],
    queryFn: getPendingApprovals,
  });

  const loading = statsQuery.isPending;
  const error = statsQuery.isError;
  const s = statsQuery.data;
  const recents = (recentQuery.data ?? []).slice(0, 5);
  const pending = (pendingQuery.data ?? []).slice(0, 5);
  const pendingCount = s?.workflows_pending ?? pending.length;

  const isEmpty =
    !loading &&
    !error &&
    (s?.documents ?? 0) === 0 &&
    pendingCount === 0 &&
    (s?.documents_shared ?? 0) === 0;

  // --- Métriques : sobriété, une couleur d'accent (emerald), alerte amber uniquement si besoin
  const metrics = [
    {
      label: "Documents",
      value: s?.documents ?? 0,
      href: "/mes-documents",
      icon: FolderOpen,
      hint: "dans votre coffre",
      tone: "emerald" as const,
    },
    {
      label: "À traiter",
      value: pendingCount,
      href: "/workflows/approbations",
      icon: WarningCircle,
      hint: pendingCount === 0 ? "aucune attente" : "approbations",
      alert: pendingCount > 0,
      tone: "amber" as const,
    },
    {
      label: "Partagés",
      value: s?.documents_shared ?? 0,
      href: "/documents-partages",
      icon: ShareNetwork,
      hint: "reçus",
      tone: "emerald" as const,
    },
    {
      label: "Favoris",
      value: s?.favorites ?? 0,
      href: "/favoris",
      icon: Star,
      hint: "suivis",
      tone: "emerald" as const,
    },
  ];

  const quick = [
    { href: "/importer", label: "Importer", desc: "Déposer des fichiers", icon: UploadSimple },
    { href: "/recherche", label: "Rechercher", desc: "Titres & OCR", icon: MagnifyingGlass },
    { href: "/mes-documents", label: "Mes documents", desc: "Arbre & inspecteur", icon: FolderOpen },
    { href: "/workflows", label: "Workflows", desc: "Circuits de validation", icon: TreeStructure },
  ];

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <ErrorState
          title="Impossible de charger le tableau de bord"
          correlationId={getLastCorrelationId()}
          onRetry={() => {
            void statsQuery.refetch();
            void recentQuery.refetch();
            void pendingQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (!loading && isEmpty) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <EmptyDocs onImport={() => router.push("/importer")} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header hero — sobre, une carte blanche opaque sur le fond Haikei global (#F4F3EF + blobs sauge/ciel/sable statiques) */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white px-6 py-6 shadow-sm sm:px-7 sm:py-7"
      >
        {/* Liseré emerald ultra-fin — seul accent chromatique fort, le reste reste zinc */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
              Tableau de bord · {todayLabel()}
            </p>
            <h1 className="mt-1.5 text-balance text-[26px] font-semibold leading-none tracking-tight text-zinc-900 sm:text-[28px]">
              {greeting()}
              {firstName ? `, ${firstName}` : ""} —{" "}
              <span className="font-normal text-zinc-500">votre GED est à jour.</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Retrouvez vos documents, les validations en attente et les accès rapides. Le fond
              Haikei clair reste statique et discret — il habille les goulottes sans distraire la lecture.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild size="sm" className="h-9">
              <Link href="/importer">
                <UploadSimple className="h-4 w-4" weight="bold" />
                Importer
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="h-9">
              <Link href="/recherche">
                <MagnifyingGlass className="h-4 w-4" />
                Rechercher
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Métriques — 4 cartes blanches, hover zinc-50, chiffre tabular, icône dans well emerald/zinc */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="skeleton h-9 w-9 rounded-xl" />
              <div className="skeleton mt-4 h-3 w-20" />
              <div className="skeleton mt-2 h-7 w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((m, idx) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: idx * 0.05, ease: "easeOut" }}
            >
              <Link
                href={m.href}
                className={cn(
                  "group flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition-colors",
                  m.alert
                    ? "border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50/70"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl ring-1",
                      m.alert
                        ? "bg-amber-100 text-amber-700 ring-amber-200"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    )}
                  >
                    <m.icon className="h-4.5 w-4.5" weight="duotone" />
                  </span>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500" />
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {m.label}
                </p>
                <p
                  className={cn(
                    "tnum mt-1 text-[30px] font-semibold leading-none tracking-tight",
                    m.alert ? "text-amber-700" : "text-zinc-900"
                  )}
                >
                  {m.value}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{m.hint}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Grille principale : 2 colonnes larges + 1 latérale — tout en cartes blanches opaques (z-10, le fond Haikei reste en z-0) */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Colonne principale */}
        <div className="space-y-4 lg:col-span-8">
          {/* À traiter */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.08, ease: "easeOut" }}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <div className="flex h-12 items-center justify-between border-b border-zinc-100 px-5 sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                  <Clock className="h-3.5 w-3.5" weight="duotone" />
                </span>
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900">À traiter</h2>
                {pendingCount > 0 && (
                  <Badge tone="amber" className="hidden sm:inline-flex">
                    {pendingCount} en attente
                  </Badge>
                )}
              </div>
              <Link
                href="/workflows/approbations"
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"
              >
                Tout voir <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <CheckCircle className="h-5 w-5" weight="duotone" />
                </span>
                <p className="mt-3 text-sm font-medium text-zinc-900">Vous êtes à jour</p>
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
                  Aucune approbation en attente. Les nouvelles demandes apparaîtront ici dès qu’un
                  document entrera en circuit.
                </p>
                <Button asChild variant="secondary" size="sm" className="mt-4">
                  <Link href="/workflows">Parcourir les workflows</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {pending.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/workflows/instances/${item.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50 sm:px-6"
                    >
                      <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                        <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-amber-400 opacity-30 motion-reduce:animate-none" />
                        <span className="relative h-1.5 w-1.5 rounded-full bg-amber-500" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium leading-tight text-zinc-800">
                          {item.document_titre || item.workflow_nom || `Circuit #${item.id}`}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {item.etape_courante_nom || item.en_attente_label || "En attente de validation"}
                        </span>
                      </span>
                      <Badge tone="amber" className="hidden shrink-0 sm:inline-flex">
                        À valider
                      </Badge>
                      <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-zinc-300 sm:block" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          {/* Récents */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.14, ease: "easeOut" }}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <div className="flex h-12 items-center justify-between border-b border-zinc-100 px-5 sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200">
                  <Folder className="h-3.5 w-3.5" weight="duotone" />
                </span>
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Récents</h2>
              </div>
              <Link
                href="/documents-recents"
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"
              >
                Tout voir <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recents.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200">
                  <Clock className="h-5 w-5" weight="duotone" />
                </span>
                <p className="mt-3 text-sm font-medium text-zinc-900">Aucun fichier récent</p>
                <p className="mt-1 text-sm text-zinc-500">Les documents ouverts apparaîtront ici.</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {recents.map((doc) => {
                  const kind = kindFromName(doc.file_name || doc.titre, doc.mime_type);
                  const Icon = KIND_ICON[kind];
                  return (
                    <li key={doc.id}>
                      <Link
                        href={`/documents/${doc.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-zinc-50 sm:px-6"
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
                            FILE_KIND_STYLE[kind]
                          )}
                        >
                          <Icon className="h-4 w-4" weight="duotone" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium leading-tight text-zinc-800">
                            {doc.titre}
                          </span>
                          <span className="block truncate text-xs text-zinc-500">
                            {doc.file_name || doc.mime_type || "Document"}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-xs tabular-nums text-zinc-400 sm:block">
                          {formatRelativeFr(doc.derniere_modification || doc.date_creation)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.section>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-4 lg:col-span-4">
          {/* Accès rapide — grille 2×2, icônes emerald sobres */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.1, ease: "easeOut" }}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Accès rapide</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Raccourcis vers les actions fréquentes.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {quick.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition-colors group-hover:bg-emerald-600 group-hover:text-white group-hover:ring-emerald-600">
                    <a.icon className="h-4 w-4" weight="duotone" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium leading-tight text-zinc-900">
                      {a.label}
                    </span>
                    <span className="block text-xs leading-tight text-zinc-500">{a.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-zinc-50 px-3.5 py-2.5 ring-1 ring-zinc-200">
              <span className="text-xs text-zinc-600">Recherche globale</span>
              <kbd className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                Ctrl K
              </kbd>
            </div>
          </motion.section>

          {/* État / infos — sobre, pas de couleur criarde */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.16, ease: "easeOut" }}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">En un coup d’œil</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3.5 py-2.5 ring-1 ring-zinc-200">
                <dt className="flex items-center gap-2 text-zinc-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Coffre
                </dt>
                <dd className="tnum font-medium text-zinc-900">{s?.documents ?? 0} docs</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-zinc-200">
                <dt className="text-zinc-600">Corbeille</dt>
                <dd className="tnum font-medium text-zinc-900">{s?.trash ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-zinc-200">
                <dt className="text-zinc-600">Workflows en cours</dt>
                <dd className="tnum font-medium text-zinc-900">{s?.workflows_in_progress ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-zinc-200">
                <dt className="text-zinc-600">Notifications</dt>
                <dd>
                  <Badge tone={ (s?.notifications_unread ?? 0) > 0 ? "amber" : "neutral" }>
                    {(s?.notifications_unread ?? 0) > 0 ? `${s?.notifications_unread} non lues` : "à jour"}
                  </Badge>
                </dd>
              </div>
            </dl>
            <p className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs leading-relaxed text-emerald-800 ring-1 ring-emerald-100">
              Astuce : glissez-déposez un fichier n’importe où pour l’importer, ou utilisez{" "}
              <span className="font-medium">Importer</span>.
            </p>
          </motion.section>

          {/* Aide discrète — pas de pattern bruyant, juste bordure et tip */}
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-5 py-4 text-center">
            <p className="text-xs font-medium text-zinc-700">Besoin d’aide ?</p>
            <p className="mx-auto mt-1 max-w-[22rem] text-xs leading-relaxed text-zinc-500">
              Consultez la documentation ou contactez votre administrateur pour les droits d’accès.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
