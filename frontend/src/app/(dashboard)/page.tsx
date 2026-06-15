"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { useWorkflowRealtime } from "@/hooks/use-workflow-realtime";
import { getDashboardStats, type DashboardStats } from "@/services/dashboard.service";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(() => {
    return getDashboardStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    void loadStats().finally(() => setLoading(false));
  }, [loadStats]);

  const handleWorkflowRealtime = useCallback(
    (payload: { workflows_pending?: number; workflows_in_progress?: number }) => {
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(typeof payload.workflows_pending === "number"
            ? { workflows_pending: payload.workflows_pending }
            : {}),
          ...(typeof payload.workflows_in_progress === "number"
            ? { workflows_in_progress: payload.workflows_in_progress }
            : {}),
        };
      });
    },
    []
  );

  useWorkflowRealtime(handleWorkflowRealtime);

  return <DashboardView stats={stats} loading={loading} />;
}
