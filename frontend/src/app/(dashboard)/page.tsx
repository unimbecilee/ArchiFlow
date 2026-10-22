"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardStats } from "@/services/dashboard.service";
import { getRecentDocuments } from "@/services/documents.service";
import { getPendingApprovals } from "@/services/workflows.service";

export default function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });
  const recentQuery = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: getRecentDocuments,
  });
  const pendingQuery = useQuery({
    queryKey: ["dashboard-pending"],
    queryFn: getPendingApprovals,
  });

  const api = statsQuery.data;
  const recent = recentQuery.data ?? [];

  return (
    <DashboardView
      loading={statsQuery.isLoading || recentQuery.isLoading}
      stats={{
        total: api?.documents ?? 0,
        pending: api?.workflows_pending ?? 0,
        shared: api?.documents_shared ?? 0,
        recent: recent.length,
      }}
      pendingItems={(pendingQuery.data ?? []).slice(0, 5).map((w) => ({
        id: String(w.id),
        title: w.document_titre || `Document #${w.document_id}`,
        type: w.workflow_nom || "Validation",
        updatedAt: w.date_debut || new Date().toISOString(),
      }))}
      recentDocuments={recent.slice(0, 8).map((d) => ({
        id: String(d.id),
        titre: d.titre || d.title || d.file_name || `Document #${d.id}`,
        file_name: d.file_name || d.titre || "",
        mime_type: d.mime_type || "",
        updated_at:
          d.derniere_modification ||
          d.date_creation ||
          new Date().toISOString(),
      }))}
    />
  );
}
