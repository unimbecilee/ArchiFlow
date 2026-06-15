import api from "@/lib/api";
import type {
  AdminCreateWorkflowPayload,
  AdminUpdateWorkflowPayload,
  AdminWorkflowDetailPayload,
  AdminWorkflowListRow,
  WorkflowFullDefinition,
} from "@/types/workflows";

export async function adminListWorkflows(): Promise<AdminWorkflowListRow[]> {
  const res = await api.get<{ success: boolean; data: AdminWorkflowListRow[] }>(
    "/api/admin/workflows"
  );
  return res.data.data ?? [];
}

export async function adminGetWorkflow(id: number): Promise<AdminWorkflowDetailPayload> {
  const res = await api.get<{ success: boolean; data: AdminWorkflowDetailPayload }>(
    `/api/admin/workflows/${id}`
  );
  return res.data.data;
}

export async function adminCreateWorkflow(
  payload: AdminCreateWorkflowPayload
): Promise<WorkflowFullDefinition> {
  const res = await api.post<{ success: boolean; data: WorkflowFullDefinition }>(
    "/api/admin/workflows",
    payload
  );
  return res.data.data;
}

export async function adminUpdateWorkflow(
  id: number,
  payload: AdminUpdateWorkflowPayload
): Promise<WorkflowFullDefinition> {
  const res = await api.put<{ success: boolean; data: WorkflowFullDefinition }>(
    `/api/admin/workflows/${id}`,
    payload
  );
  return res.data.data;
}

export async function adminDeleteWorkflow(id: number): Promise<void> {
  await api.delete(`/api/admin/workflows/${id}`);
}
