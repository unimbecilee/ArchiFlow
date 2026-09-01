"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, ListBullets, SquaresFour } from "@phosphor-icons/react";
import { WorkflowInstanceList } from "@/components/workflows/workflow-instance-list";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { Button } from "@/components/ui/button";
import { useWorkflowRealtime } from "@/hooks/use-workflow-realtime";
import { getPendingApprovals } from "@/services/workflows.service";
import type { WorkflowInstance } from "@/types/workflows";

export default function ApprobationsPage() {
  const [items, setItems] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<"compact" | "detail">("compact");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getPendingApprovals());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useWorkflowRealtime(() => {
    void load();
  });

  return (
    <PageFrame>
      <PageHeader
        title="Approbations"
        description="Circuits en attente de votre décision."
        icon={<CheckCircle className="h-5 w-5" weight="duotone" />}
        actions={
          <div className="flex gap-2">
            <Button
              variant={layout === "compact" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setLayout("compact")}
            >
              <ListBullets className="h-4 w-4" />
              File
            </Button>
            <Button
              variant={layout === "detail" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setLayout("detail")}
            >
              <SquaresFour className="h-4 w-4" />
              Detail
            </Button>
          </div>
        }
      />
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? (
        <ListSkeleton rows={3} />
      ) : (
        <WorkflowInstanceList
          items={items}
          mode="pending"
          pendingLayout={layout}
          onRefresh={load}
        />
      )}
    </PageFrame>
  );
}
