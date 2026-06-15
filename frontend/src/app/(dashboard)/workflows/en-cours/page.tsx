"use client";

import { useCallback, useEffect, useState } from "react";
import { ListBullets } from "@phosphor-icons/react";
import { WorkflowInstanceList } from "@/components/workflows/workflow-instance-list";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { useWorkflowRealtime } from "@/hooks/use-workflow-realtime";
import { getInProgress } from "@/services/workflows.service";
import type { WorkflowInstance } from "@/types/workflows";

export default function EnCoursPage() {
  const [items, setItems] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getInProgress());
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
        title="En cours"
        description="Suivez l'avancement de vos demandes de validation actives."
        icon={<ListBullets className="h-6 w-6" weight="duotone" />}
      />
      {loading ? <ListSkeleton rows={3} /> : <WorkflowInstanceList items={items} mode="progress" onRefresh={load} />}
    </PageFrame>
  );
}
