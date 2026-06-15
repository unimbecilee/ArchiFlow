import api from "@/lib/api";

export interface DashboardStats {
  documents: number;
  trash: number;
  workflows_pending: number;
  workflows_in_progress: number;
  documents_shared: number;
  favorites: number;
  notifications_unread: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<{ success: boolean; data: DashboardStats }>(
    "/api/dashboard/stats"
  );
  return res.data.data;
}
