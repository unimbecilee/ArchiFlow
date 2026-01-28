import api from './api';

export type WorkflowStepApprover = {
  utilisateur_id?: number;
  role_id?: number;
  organisation_id?: number;
};

export type WorkflowStep = {
  nom: string;
  description?: string;
  type_approbation?: 'SIMPLE' | 'MULTIPLE';
  delai_max?: number;
  approbateurs?: WorkflowStepApprover[];
};

export type WorkflowCreate = {
  nom: string;
  description?: string;
  organisation_id?: number;
  etapes?: WorkflowStep[];
};

export async function getWorkflows(params?: { organisation_id?: number }) {
  const { data } = await api.get('/workflows', { params });
  return data;
}

export async function createWorkflow(payload: WorkflowCreate) {
  const { data } = await api.post('/workflows', payload);
  return data;
}

export async function getWorkflow(id: number) {
  const { data } = await api.get(`/workflows/${id}`);
  return data;
}

export async function updateWorkflow(id: number, payload: Partial<WorkflowCreate>) {
  const { data } = await api.put(`/workflows/${id}`, payload);
  return data;
}

export async function deleteWorkflow(id: number) {
  const { data } = await api.delete(`/workflows/${id}`);
  return data;
}

export async function startWorkflow(documentId: number, payload: { workflow_id: number; commentaire?: string }) {
  const { data } = await api.post(`/documents/${documentId}/workflows`, payload);
  return data;
}

export async function getDocumentWorkflows(documentId: number) {
  const { data } = await api.get(`/documents/${documentId}/workflows`);
  return data;
}

export async function listInstances(params?: { limit?: number; offset?: number }) {
  const { data } = await api.get('/workflow-instances', { params });
  return data;
}

export async function listPendingApprovals() {
  const { data } = await api.get('/workflow-instances/pending');
  return data;
}

export async function approveInstance(instanceId: number, payload?: { commentaire?: string }) {
  const { data } = await api.post(`/workflow-instances/${instanceId}/approve`, payload || {});
  return data;
}

export async function rejectInstance(instanceId: number, payload?: { commentaire?: string }) {
  const { data } = await api.post(`/workflow-instances/${instanceId}/reject`, payload || {});
  return data;
}

export async function cancelInstance(instanceId: number) {
  const { data } = await api.post(`/workflow-instances/${instanceId}/cancel`, {});
  return data;
}

export async function getInstance(instanceId: number) {
  const { data } = await api.get(`/workflow-instances/${instanceId}`);
  return data;
}

export async function getWorkflowEtapes(workflowId: number) {
  const { data } = await api.get(`/workflows/${workflowId}/etapes`);
  return data;
}

export async function replaceApprovers(workflowId: number, etapeId: number, approbateurs: Array<{ type?: 'utilisateur'|'role'|'organisation'; id?: number; utilisateur_id?: number; role_id?: number; organisation_id?: number; }>) {
  const { data } = await api.put(`/workflows/${workflowId}/etapes/${etapeId}/approbateurs`, { approbateurs });
  return data;
}
