"use client";

import { CheckCircle, XCircle, Clock } from "@phosphor-icons/react";
import type { WorkflowApprovalRecord } from "@/types/workflows";
import { cn } from "@/lib/utils";

type WorkflowApprovalTimelineProps = {
  approvals: WorkflowApprovalRecord[];
};

const DECISION_LABELS: Record<string, string> = {
  APPROUVE: "Approuve",
  REJETE: "Rejete",
  ANNULE: "Annule",
};

function decisionMeta(decision: string) {
  if (decision === "APPROUVE") {
    return {
      icon: (
        <CheckCircle
          className="h-[1.125rem] w-[1.125rem] text-primary"
          weight="fill"
        />
      ),
      ring: "ring-primary/25 bg-accent-soft",
      badge: "bg-primary/12 text-accent-soft-foreground",
    };
  }
  if (decision === "REJETE") {
    return {
      icon: (
        <XCircle
          className="h-[1.125rem] w-[1.125rem] text-destructive"
          weight="fill"
        />
      ),
      ring: "ring-destructive/30 bg-destructive-soft",
      badge: "bg-destructive-soft text-destructive-soft-foreground",
    };
  }
  return {
    icon: (
      <Clock
        className="h-[1.125rem] w-[1.125rem] text-muted-foreground"
        weight="duotone"
      />
    ),
    ring: "ring-border bg-muted",
    badge: "bg-muted text-foreground",
  };
}

export function WorkflowApprovalTimeline({
  approvals,
}: WorkflowApprovalTimelineProps) {
  if (approvals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune decision enregistree.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {approvals.map((a) => {
        const meta = decisionMeta(a.decision);
        const decisionLabel = DECISION_LABELS[a.decision] ?? a.decision;

        return (
          <li
            key={a.id}
            className="flex gap-3 rounded-2xl border border-border bg-muted/40 p-4"
          >
            <span
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1",
                meta.ring,
              )}
              aria-hidden
            >
              {meta.icon}
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {a.etape_nom || `Etape #${a.step_id}`}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none",
                    meta.badge,
                  )}
                >
                  {decisionLabel}
                </span>
              </div>
              {a.approver_email && (
                <p className="text-sm text-muted-foreground">
                  {a.approver_email}
                </p>
              )}
              {a.commentaire && (
                <p className="text-sm leading-relaxed text-foreground">
                  {a.commentaire}
                </p>
              )}
              <p className="text-xs font-medium text-muted-foreground">
                {new Date(a.date).toLocaleString("fr-FR")}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
