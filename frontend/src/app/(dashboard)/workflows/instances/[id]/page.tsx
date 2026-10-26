"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  GitBranch,
  XCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { WorkflowApprovalTimeline } from "@/components/workflows/workflow-approval-timeline";
import { getWorkflowInstance } from "@/services/workflows.service";
import type {
  WorkflowInstanceDetail,
  WorkflowStepProgress,
} from "@/types/workflows";
import { cn } from "@/lib/utils";

function statusLabel(statut: string) {
  const map: Record<string, string> = {
    EN_COURS: "En cours",
    APPROUVE: "Approuve",
    REJETE: "Rejete",
    ANNULE: "Annule",
    EN_ATTENTE: "En attente",
    NON_PARCOURUE: "Non parcourue",
  };
  return map[statut] || statut;
}

function stepIcon(statut: string) {
  if (statut === "APPROUVE") {
    return (
      <CheckCircle className="h-4 w-4 text-primary" weight="fill" aria-hidden />
    );
  }
  if (statut === "REJETE") {
    return (
      <XCircle className="h-4 w-4 text-destructive" weight="fill" aria-hidden />
    );
  }
  if (statut === "EN_COURS") {
    return (
      <Clock
        className="h-4 w-4 text-warning-soft-foreground"
        weight="duotone"
        aria-hidden
      />
    );
  }
  return (
    <Clock className="h-4 w-4 text-muted-foreground" weight="regular" aria-hidden />
  );
}

function StepsProgress({ steps }: { steps: WorkflowStepProgress[] }) {
  if (steps.length === 0) return null;
  return (
    <ol className="space-y-2">
      {steps.map((s) => (
        <li
          key={s.id}
          className={cn(
            "flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm",
            s.statut === "EN_COURS" && "border-warning/40 bg-warning-soft/40",
            s.statut === "APPROUVE" && "bg-muted/50",
            s.statut === "REJETE" && "border-destructive/30 bg-destructive-soft/40",
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-border">
            {stepIcon(s.statut)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {s.ordre}. {s.nom}
            </p>
            <p className="text-xs text-muted-foreground">
              {statusLabel(s.statut)}
              {typeof s.decisions === "number" && s.decisions > 0
                ? ` · ${s.decisions} decision(s)`
                : ""}
              {s.date
                ? ` · ${new Date(s.date).toLocaleString("fr-FR")}`
                : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
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

  const statut = instance.statut || instance.status || "";
  const approvals = instance.approvals ?? [];
  const steps = instance.etapes ?? [];
  const finished =
    statut === "APPROUVE" || statut === "REJETE" || statut === "ANNULE";
  const etapeLabel = finished
    ? instance.etape_courante_nom || "Circuit termine"
    : instance.etape_courante_nom || "—";

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
        description={`${instance.workflow_nom || "Workflow"} · ${statusLabel(statut)}`}
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
              {statusLabel(statut)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Etape
            </dt>
            <dd className="mt-1 text-foreground">{etapeLabel}</dd>
          </div>
          {instance.initiator_email && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Initiateur
              </dt>
              <dd className="mt-1 text-foreground">
                {instance.initiator_email}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Document
            </dt>
            <dd className="mt-1">
              <Link
                href={`/documents/${instance.document_id}`}
                className="font-medium text-accent-soft-foreground hover:underline"
              >
                #{instance.document_id}
                {instance.document_titre
                  ? ` — ${instance.document_titre}`
                  : ""}
              </Link>
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

      {steps.length > 0 && (
        <PagePanel
          title="Circuit"
          subtitle={`${steps.length} etape(s) du workflow`}
        >
          <StepsProgress steps={steps} />
        </PagePanel>
      )}

      <PagePanel
        title="Historique des decisions"
        subtitle={`${approvals.length} decision(s) enregistree(s)`}
      >
        {approvals.length === 0 && finished ? (
          <p className="text-sm text-muted-foreground">
            Aucune decision enregistree pour cette instance (cloture sans
            historique). Les prochaines validations consignent chaque
            approbation / rejet.
          </p>
        ) : (
          <WorkflowApprovalTimeline approvals={approvals} />
        )}
      </PagePanel>
    </PageFrame>
  );
}
