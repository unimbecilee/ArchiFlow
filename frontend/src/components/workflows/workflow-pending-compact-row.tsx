"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/feedback/confirm-provider";
import { getApiErrorMessage } from "@/lib/api-error";
import { approveInstance, rejectInstance } from "@/services/workflows.service";
import type { WorkflowInstance } from "@/types/workflows";
import { toast } from "sonner";

type Props = {
  item: WorkflowInstance;
  onRefresh: () => void;
};

export function WorkflowPendingCompactRow({ item, onRefresh }: Props) {
  const confirm = useConfirm();
  const [verified, setVerified] = useState(false);
  const [acting, setActing] = useState(false);

  const run = async (kind: "approve" | "reject") => {
    if (!verified) {
      toast.message("Cochez la verification avant de decider.");
      return;
    }
    const ok = await confirm({
      title: kind === "approve" ? "Approuver" : "Rejeter",
      description:
        kind === "approve"
          ? `Confirmer l'approbation de « ${item.document_titre || `Document #${item.document_id}` } » ?`
          : `Confirmer le rejet de « ${item.document_titre || `Document #${item.document_id}` } » ?`,
      confirmLabel: kind === "approve" ? "Approuver" : "Rejeter",
      destructive: kind === "reject",
    });
    if (!ok) return;
    setActing(true);
    try {
      if (kind === "approve") await approveInstance(item.id);
      else await rejectInstance(item.id);
      toast.success(kind === "approve" ? "Approuve" : "Rejete");
      onRefresh();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Action impossible"));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-medium text-zinc-900">
          {item.document_titre || `Document #${item.document_id}`}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {item.workflow_nom} · {item.etape_courante_nom || "—"} · #{item.id}
        </p>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-zinc-600">
          <Checkbox checked={verified} onCheckedChange={(v) => setVerified(!!v)} />
          J&apos;ai verifie le document
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" asChild className="gap-1">
          <Link href={`/documents/${item.document_id}`} target="_blank" rel="noopener noreferrer">
            <ArrowSquareOut className="h-4 w-4" />
            Voir
          </Link>
        </Button>
        <Button
          size="sm"
          disabled={!verified || acting}
          className="gap-1"
          onClick={() => void run("approve")}
        >
          <CheckCircle className="h-4 w-4" weight="bold" />
          Approuver
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!verified || acting}
          className="gap-1 border-red-200 text-red-700 hover:bg-red-50"
          onClick={() => void run("reject")}
        >
          <XCircle className="h-4 w-4" weight="bold" />
          Rejeter
        </Button>
      </div>
    </div>
  );
}
