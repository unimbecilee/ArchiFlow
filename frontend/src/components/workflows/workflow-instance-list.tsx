"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Prohibit, ArrowRight, FileText } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { WorkflowInstance } from "@/types/workflows";
import { cancelInstance } from "@/services/workflows.service";
import { WorkflowApprovalCard } from "@/components/workflows/workflow-approval-card";
import { WorkflowPendingCompactRow } from "@/components/workflows/workflow-pending-compact-row";
import { EmptyState } from "@/components/layout/empty-state";
import { GitBranch } from "@phosphor-icons/react";

type Props = {
  items: WorkflowInstance[];
  mode: "pending" | "progress" | "completed";
  onRefresh: () => void;
  emptyDescription?: string;
  /** pending: file d'attente compacte vs fiche detaillee */
  pendingLayout?: "compact" | "detail";
};

function statusBadge(statut: string) {
  const colors: Record<string, string> = {
    EN_COURS: "bg-warning-soft text-warning-soft-foreground",
    APPROUVE: "bg-primary/15 text-accent-soft-foreground",
    REJETE: "bg-destructive-soft text-destructive-soft-foreground",
    ANNULE: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    EN_COURS: "En cours",
    APPROUVE: "Approuve",
    REJETE: "Rejete",
    ANNULE: "Annule",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        colors[statut] || "bg-muted text-muted-foreground"
      }`}
    >
      {labels[statut] || statut}
    </span>
  );
}

export function WorkflowInstanceList({
  items,
  mode,
  onRefresh,
  emptyDescription,
  pendingLayout = "detail",
}: Props) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const actCancel = async (id: number) => {
    setLoadingId(id);
    try {
      await cancelInstance(id);
      onRefresh();
    } finally {
      setLoadingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="Aucun element"
        description={
          emptyDescription ||
          "Les demandes de validation apparaitront ici lorsqu'elles seront disponibles."
        }
        icon={<GitBranch className="h-6 w-6" weight="duotone" />}
      />
    );
  }

  return (
    <motion.ul
      className="space-y-4"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      }}
    >
      {items.map((item) => {
        if (mode === "pending") {
          if (pendingLayout === "compact") {
            return (
              <motion.li
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <WorkflowPendingCompactRow item={item} onRefresh={onRefresh} />
              </motion.li>
            );
          }
          return (
            <motion.li
              key={item.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            >
              <WorkflowApprovalCard item={item} onRefresh={onRefresh} />
            </motion.li>
          );
        }

        const detailHref = `/workflows/instances/${item.id}`;
        const docHref = `/documents/${item.document_id}`;
        const daysWaiting = item.date_debut
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(item.date_debut).getTime()) / 86_400_000,
              ),
            )
          : null;

        return (
          <motion.li
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.1)] md:p-6"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-1">
                {mode === "completed" ? (
                  <Link
                    href={detailHref}
                    className="group block font-medium text-foreground hover:text-accent-soft-foreground"
                  >
                    {item.document_titre || `Document #${item.document_id}`}
                    <ArrowRight className="ml-1 inline h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ) : (
                  <p className="font-medium text-foreground">
                    {item.document_titre || `Document #${item.document_id}`}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {item.workflow_nom} · {item.etape_courante_nom || "—"}
                </p>
                {mode === "progress" && item.en_attente_label && (
                  <p className="text-sm text-warning-soft-foreground">
                    En attente : {item.en_attente_label}
                  </p>
                )}
                {mode === "progress" && daysWaiting !== null && (
                  <p className="text-xs text-muted-foreground">
                    Depuis {daysWaiting} jour{daysWaiting !== 1 ? "s" : ""}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Instance #{item.id}
                  {item.date_debut &&
                    ` · Debut ${new Date(item.date_debut).toLocaleString("fr-FR")}`}
                  {item.date_fin &&
                    ` · Fin ${new Date(item.date_fin).toLocaleString("fr-FR")}`}
                </p>
              </div>
              {statusBadge(item.statut || item.status || "")}
            </div>

            {(mode === "completed" || mode === "progress") && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <Link href={docHref}>
                    <FileText className="h-4 w-4" />
                    Document
                  </Link>
                </Button>
                {mode === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1.5"
                  >
                    <Link href={detailHref}>
                      Historique
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {mode === "progress" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={loadingId === item.id}
                onClick={() => actCancel(item.id)}
                className="mt-4 gap-1.5"
              >
                <Prohibit className="h-4 w-4" weight="bold" />
                Annuler
              </Button>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
