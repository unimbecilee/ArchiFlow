"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive } from "@phosphor-icons/react";
import { WorkflowInstanceList } from "@/components/workflows/workflow-instance-list";
import {
  WorkflowStatusTabs,
  type WorkflowStatusTab,
} from "@/components/workflows/workflow-status-tabs";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { getCompleted, getMyDecisions } from "@/services/workflows.service";
import type { WorkflowInstance } from "@/types/workflows";
import { useAuthStore } from "@/store/auth-store";
import { canViewOrgWorkflows } from "@/lib/roles";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/components/layout/error-banner";
import { getApiErrorMessage } from "@/lib/api-error";

export default function TerminesPage() {
  const { user } = useAuthStore();
  const canViewAll = canViewOrgWorkflows(user?.role, user?.capabilities);
  const [tab, setTab] = useState<WorkflowStatusTab>("all");
  const [viewAll, setViewAll] = useState(false);
  const [items, setItems] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "my-decisions") {
        setItems(await getMyDecisions());
      } else {
        setItems(
          await getCompleted({
            status: tab === "all" ? undefined : tab,
            all: canViewAll && viewAll,
          })
        );
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Impossible de charger l'historique"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, viewAll, canViewAll]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Workflows"
        title="Termines"
        description="Workflows que vous avez lances ou valides. Filtrez par statut ou consultez vos decisions."
        icon={<Archive className="h-6 w-6" weight="duotone" />}
      />

      <PagePanel title="Filtres" subtitle="Parcourir les instances cloturees">
        <div className="space-y-4">
          <WorkflowStatusTabs value={tab} onChange={setTab} />
          {canViewAll && tab !== "my-decisions" && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={viewAll}
                onChange={(e) => setViewAll(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
              />
              <Label className="cursor-pointer font-normal">
                Voir toute l&apos;organisation
              </Label>
            </label>
          )}
        </div>
      </PagePanel>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <ListSkeleton rows={3} />
      ) : (
        <WorkflowInstanceList
          items={items}
          mode="completed"
          onRefresh={load}
          emptyDescription={
            tab === "my-decisions"
              ? "Vous n'avez pas encore participe a une validation terminee."
              : tab === "all"
                ? "Aucun workflow termine pour lequel vous etes initiateur ou validateur."
                : "Aucun workflow dans cette categorie."
          }
        />
      )}
    </PageFrame>
  );
}
