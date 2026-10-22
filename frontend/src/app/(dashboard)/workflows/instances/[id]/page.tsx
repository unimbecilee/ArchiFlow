"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, GitBranch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { WorkflowApprovalTimeline } from "@/components/workflows/workflow-approval-timeline";
import { getWorkflowInstance } from "@/services/workflows.service";
import type { WorkflowInstanceDetail } from "@/types/workflows";

function statusLabel(statut: string) {
  const map: Record<string, string> = {
    EN_COURS: "En cours",
    APPROUVE: "Approuve",
    REJETE: "Rejete",
    ANNULE: "Annule",
  };
  return map[statut] || statut;
}

export default function WorkflowInstanceDetailPage() {
  const params = useParams();
  const instanceId = Number(params.id);

  const [instance, setInstance] = useState<WorkflowInstanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!instanceId || Number.isNaN(instanceId)) return;
    setLoading(true);
    setError(null);
    try {
      setInstance(await getWorkflowInstance(instanceId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Instance inaccessible");
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <PageFrame>
        <ListSkeleton rows={4} />
      </PageFrame>
    );
  }

  if (error || !instance) {
    return (
      <PageFrame>
        <Link
          href="/workflows/termines"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent-soft-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Termines
        </Link>
        <ErrorBanner message={error || "Instance introuvable"} />
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <Link
        href="/workflows/termines"
        className="inline-flex items-center gap-1 text-sm font-medium text-accent-soft-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Termines
      </Link>

      <PageHeader
        eyebrow="Workflow"
        title={instance.document_titre || `Document #${instance.document_id}`}
        description={`${instance.workflow_nom || "Workflow"} · ${statusLabel(instance.statut)}`}
        icon={<GitBranch className="h-6 w-6" weight="duotone" />}
        actions={
          <Button asChild className="gap-1.5">
            <Link href={`/documents/${instance.document_id}`}>
              <FileText className="h-4 w-4" />
              Voir le document
            </Link>
          </Button>
        }
      />

      <PagePanel title="Resume" subtitle={`Instance #${instance.id}`}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Statut
            </dt>
            <dd className="mt-1 font-medium text-foreground">
              {statusLabel(instance.statut)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Etape
            </dt>
            <dd className="mt-1 text-foreground">
              {instance.etape_courante_nom || "—"}
            </dd>
          </div>
          {instance.date_debut && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Debut
              </dt>
              <dd className="mt-1 text-foreground">
                {new Date(instance.date_debut).toLocaleString("fr-FR")}
              </dd>
            </div>
          )}
          {instance.date_fin && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fin
              </dt>
              <dd className="mt-1 text-foreground">
                {new Date(instance.date_fin).toLocaleString("fr-FR")}
              </dd>
            </div>
          )}
          {instance.commentaire && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Commentaire initial
              </dt>
              <dd className="mt-1 text-foreground">{instance.commentaire}</dd>
            </div>
          )}
        </dl>
      </PagePanel>

      <PagePanel
        title="Historique des decisions"
        subtitle={`${instance.approvals?.length ?? 0} decision(s) enregistree(s)`}
      >
        <WorkflowApprovalTimeline approvals={instance.approvals ?? []} />
      </PagePanel>
    </PageFrame>
  );
}
