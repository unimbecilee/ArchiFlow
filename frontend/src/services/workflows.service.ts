import api from "@/lib/api";
import type {
  ValidationContext,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowInstanceDetail,
} from "@/types/workflows";

export async function listWorkflows(): Promise<WorkflowDefinition[]> {
  const res = await api.get<{ success: boolean; data: WorkflowDefinition[] }>(
    "/api/workflows"
  );
  return res.data.data ?? [];
}

export async function startValidation(
  documentId: number,
  commentaire?: string
): Promise<WorkflowInstance> {
  const res = await api.post<{ success: boolean; data: WorkflowInstance }>(
    "/api/workflows/validation/start",
    { document_id: documentId, commentaire }
  );
  return res.data.data;
}

export async function restartValidation(
  documentId: number,
  commentaire?: string
): Promise<WorkflowInstance> {
  const res = await api.post<{ success: boolean; data: WorkflowInstance }>(
    "/api/workflows/validation/restart",
    { document_id: documentId, commentaire }
  );
  return res.data.data;
}

export async function getValidationContext(
  documentId: number
): Promise<ValidationContext> {
  const res = await api.get<{ success: boolean; data: ValidationContext }>(
    `/api/documents/${documentId}/validation-context`
  );
  return res.data.data;
}

export async function getPendingApprovals(): Promise<WorkflowInstance[]> {
  const res = await api.get<{ success: boolean; data: WorkflowInstance[] }>(
    "/api/workflows/instances/pending"
  );
  return res.data.data ?? [];
}

export async function getInProgress(): Promise<WorkflowInstance[]> {
  const res = await api.get<{ success: boolean; data: WorkflowInstance[] }>(
    "/api/workflows/instances/in-progress"
  );
  return res.data.data ?? [];
}

export async function getCompleted(
  options?: { status?: string; all?: boolean }
): Promise<WorkflowInstance[]> {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.all) params.set("all", "true");
  const qs = params.toString();
  const res = await api.get<{ success: boolean; data: WorkflowInstance[] }>(
    `/api/workflows/instances/completed${qs ? `?${qs}` : ""}`
  );
  return res.data.data ?? [];
}

export async function getMyDecisions(): Promise<WorkflowInstance[]> {
  const res = await api.get<{ success: boolean; data: WorkflowInstance[] }>(
    "/api/workflows/instances/my-decisions"
  );
  return res.data.data ?? [];
}

export async function getWorkflowInstance(id: number): Promise<WorkflowInstanceDetail> {
  const res = await api.get<{ success: boolean; data: WorkflowInstanceDetail }>(
    `/api/workflows/instances/${id}`
  );
  return res.data.data;
}

export async function approveInstance(
  id: number,
  commentaire?: string
): Promise<void> {
  await api.post(`/api/workflows/instances/${id}/approve`, { commentaire });
}

export async function rejectInstance(
  id: number,
  commentaire?: string
): Promise<void> {
  await api.post(`/api/workflows/instances/${id}/reject`, { commentaire });
}

export async function cancelInstance(id: number): Promise<void> {
  await api.post(`/api/workflows/instances/${id}/cancel`);
}
