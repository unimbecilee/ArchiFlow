"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { WorkflowInstanceList } from "@/components/workflows/workflow-instance-list";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { ErrorBanner } from "@/components/layout/error-banner";
import { useWorkflowRealtime } from "@/hooks/use-workflow-realtime";
import { getPendingApprovals } from "@/services/workflows.service";
import type { WorkflowInstance } from "@/types/workflows";

export default function ApprobationsPage() {
  const [items, setItems] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        eyebrow="Workflows"
        title="Approbations"
        description="Consultez l'apercu du document, confirmez la verification, puis approuvez ou rejetez."
        icon={<CheckCircle className="h-6 w-6" weight="duotone" />}
      />
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <ListSkeleton rows={3} /> : <WorkflowInstanceList items={items} mode="pending" onRefresh={load} />}
    </PageFrame>
  );
}
