"use client";

import { motion } from "framer-motion";
import {
  UploadSimple,
  MagnifyingGlass,
  FolderOpen,
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DashboardViewProps = {
  firstName?: string;
  stats?: {
    total: number;
    pending: number;
    shared: number;
    recent: number;
  };
  pendingItems?: Array<{
    id: string;
    title: string;
    type: string;
    updatedAt: string;
  }>;
  recentDocuments?: Array<{
    id: string;
    titre: string;
    file_name: string;
    mime_type: string;
    updated_at: string;
  }>;
  loading?: boolean;
};

export function DashboardView({
  firstName,
  stats = { total: 0, pending: 0, shared: 0, recent: 0 },
  pendingItems = [],
  recentDocuments = [],
  loading = false,
}: DashboardViewProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "shared" | "recent"
  >("all");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return "Bonne nuit";
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const todayLabel = () =>
    new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const metrics = [
    {
      label: "Documents",
      value: stats.total,
      href: "/mes-documents",
      icon: FileText,
      alert: false,
      hint: "Au total",
    },
    {
      label: "À traiter",
      value: stats.pending,
      href: "/workflows/approbations",
      icon: Clock,
      alert: stats.pending > 0,
      hint:
        stats.pending > 0 ? `${stats.pending} en attente` : "Rien en attente",
    },
    {
      label: "Partagés",
      value: stats.shared,
      href: "/documents-partages",
      icon: FolderOpen,
      alert: false,
      hint: "Avec moi",
    },
    {
      label: "Récents",
      value: stats.recent,
      href: "/documents-recents",
      icon: CheckCircle,
      alert: false,
      hint: "Cette semaine",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-e1 sm:p-6"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Tableau de bord · {todayLabel()}
            </p>
            <h1 className="mt-1.5 text-balance text-[22px] font-semibold leading-none tracking-tight text-foreground sm:text-[24px]">
              {greeting()}
              {firstName ? `, ${firstName}` : ""} —{" "}
              <span className="font-normal text-muted-foreground">
                votre GED est à jour.
              </span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Retrouvez vos documents, les validations en attente et les accès
              rapides.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild size="sm" className="h-9">
              <Link href="/importer">
                <UploadSimple className="h-4 w-4" weight="bold" />
                Importer
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/recherche">
                <MagnifyingGlass className="h-4 w-4" />
                Rechercher
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="mt-4 h-3 w-20" />
              <Skeleton className="mt-2 h-7 w-12" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((m, idx) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.32,
                delay: idx * 0.05,
                ease: "easeOut",
              }}
            >
              <Link
                href={m.href}
                className={cn(
                  "group flex h-full flex-col rounded-lg border border-border bg-card p-5 shadow-e1 transition-colors duration-200",
                  m.alert
                    ? "border-warning/30 bg-warning-soft/30 hover:border-warning hover:bg-warning-soft/50"
                    : "hover:border-border-strong hover:shadow-e2",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md ring-1",
                      m.alert
                        ? "bg-warning-soft text-warning ring-warning/30"
                        : "bg-accent-soft text-accent-soft-foreground ring-accent/30",
                    )}
                  >
                    <m.icon className="h-4.5 w-4.5" weight="duotone" />
                  </span>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-subtle-foreground transition-colors group-hover:text-muted-foreground" />
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {m.label}
                </p>
                <p
                  className={cn(
                    "tnum mt-1 text-[26px] font-semibold leading-none tracking-tight",
                    m.alert ? "text-warning" : "text-foreground",
                  )}
                >
                  {m.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{m.hint}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">
              À traiter
            </h2>
            <div
              className="flex items-center gap-1 border border-border rounded-md bg-muted/40 p-0.5"
              role="tablist"
            >
              {["all", "pending", "shared", "recent"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={cn(
                    "rounded-sm px-2.5 py-1.5 text-[11px] font-medium transition-colors duration-150",
                    activeTab === tab
                      ? "bg-card text-foreground shadow-e1"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab === "all" && "Tout"}
                  {tab === "pending" && "À valider"}
                  {tab === "shared" && "Partagés"}
                  {tab === "recent" && "Récents"}
                </button>
              ))}
            </div>
          </div>

          {pendingItems.length === 0 && activeTab !== "all" ? (
            <Card className="min-h-[240px] max-h-[300px]">
              <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground ring-1 ring-accent/30">
                  <FolderOpen className="h-7 w-7" weight="duotone" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  Aucun élément
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {activeTab === "pending"
                    ? "Aucune validation en attente. Tout est à jour !"
                    : activeTab === "shared"
                      ? "Aucun document partagé avec vous pour le moment."
                      : "Aucun document récent."}
                </p>
                {activeTab === "pending" && (
                  <Button asChild variant="soft" className="mt-4 gap-1.5">
                    <Link href="/workflows">
                      <ArrowRight className="h-3.5 w-3.5" />
                      Voir les workflows
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="sticky left-0 z-10 border-b border-border bg-card/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground backdrop-blur">
                        Document
                      </th>
                      <th className="sticky left-0 z-10 border-b border-border bg-card/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground backdrop-blur">
                        Type
                      </th>
                      <th className="sticky left-0 z-10 border-b border-border bg-card/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground backdrop-blur">
                        Action
                      </th>
                      <th className="sticky left-0 z-10 border-b border-border bg-card/95 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground backdrop-blur">
                        Mis à jour
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingItems
                      .slice(0, activeTab === "all" ? 5 : 10)
                      .map((item, rowIdx) => (
                        <tr
                          key={item.id}
                          className={cn(
                            "border-b border-border last:border-0 transition-colors duration-150 hover:bg-accent/60",
                            rowIdx % 2 === 0 ? "bg-card" : "bg-muted/30",
                          )}
                        >
                          <td className="px-4 py-2.5 align-middle text-foreground">
                            <Link
                              href={`/documents/${item.id}`}
                              className="font-medium hover:text-primary"
                            >
                              {item.title}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 align-middle text-muted-foreground">
                            {item.type}
                          </td>
                          <td className="px-4 py-2.5 align-middle">
                            <Badge tone="warning">Valider</Badge>
                          </td>
                          <td className="px-4 py-2.5 align-middle text-right text-muted-foreground tnum">
                            {formatDate(item.updatedAt)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {pendingItems.length > (activeTab === "all" ? 5 : 10) && (
                <div className="border-t border-border bg-muted/40 px-4 py-3">
                  <Link
                    href="/workflows/approbations"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Voir tout ({pendingItems.length})
                  </Link>
                </div>
              )}
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-[15px] font-semibold text-foreground">
                Récents
              </h3>
              <Link
                href="/documents-recents"
                className="text-sm font-medium text-primary hover:underline"
              >
                Voir tout
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="sticky left-0 z-10 border-b border-border bg-card/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground backdrop-blur">
                      Document
                    </th>
                    <th className="sticky left-0 z-10 border-b border-border bg-card/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground backdrop-blur">
                      Fichier
                    </th>
                    <th className="sticky left-0 z-10 border-b border-border bg-card/95 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground backdrop-blur">
                      Mis à jour
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocuments.slice(0, 5).map((doc, rowIdx) => (
                    <tr
                      key={doc.id}
                      className={cn(
                        "border-b border-border last:border-0 transition-colors duration-150 hover:bg-accent/60",
                        rowIdx % 2 === 0 ? "bg-card" : "bg-muted/30",
                      )}
                    >
                      <td className="px-4 py-2.5 align-middle">
                        <Link
                          href={`/documents/${doc.id}`}
                          className="flex items-center gap-2 font-medium hover:text-primary"
                        >
                          <FileText
                            className="h-4 w-4 text-muted-foreground"
                            weight="duotone"
                          />
                          {doc.titre}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 align-middle text-muted-foreground">
                        {doc.file_name || doc.mime_type || "Document"}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-right text-muted-foreground tnum">
                        {formatDate(doc.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardContent className="p-5 pt-0">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-foreground">
                  Accès rapide
                </h3>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  {
                    label: "Importer",
                    href: "/importer",
                    icon: UploadSimple,
                    primary: true,
                  },
                  {
                    label: "Mes documents",
                    href: "/mes-documents",
                    icon: FolderOpen,
                  },
                  { label: "Workflows", href: "/workflows", icon: FileText },
                  {
                    label: "Recherche",
                    href: "/recherche",
                    icon: MagnifyingGlass,
                  },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-150",
                      action.primary
                        ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <action.icon
                      className="h-4.5 w-4.5 shrink-0"
                      weight="duotone"
                    />
                    <span className="font-medium">{action.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 pt-0">
              <h3 className="text-[15px] font-semibold text-foreground">
                Raccourcis
              </h3>
              <div className="mt-3 space-y-1.5">
                <kbd className="inline-flex items-center gap-1.5 rounded border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  <span>⌘</span> K{" "}
                  <span className="mx-1 text-subtle-foreground">→</span>{" "}
                  Recherche globale
                </kbd>
                <kbd className="inline-flex items-center gap-1.5 rounded border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  <span>⌘</span> N{" "}
                  <span className="mx-1 text-subtle-foreground">→</span> Nouveau
                  document
                </kbd>
                <kbd className="inline-flex items-center gap-1.5 rounded border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  <span>⌘</span> /{" "}
                  <span className="mx-1 text-subtle-foreground">→</span> Palette
                  de commandes
                </kbd>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
