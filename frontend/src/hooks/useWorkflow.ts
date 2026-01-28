import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  getWorkflows,
  createWorkflow,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  startWorkflow,
  getDocumentWorkflows,
  listInstances,
  listPendingApprovals,
  approveInstance,
  rejectInstance,
  cancelInstance,
  getInstance,
  getWorkflowEtapes,
  WorkflowCreate,
} from '../services/workflowService';

export function useWorkflows(params?: { organisation_id?: number }) {
  return useQuery(['workflows', params], () => getWorkflows(params));
}

export function useWorkflow(id: number) {
  return useQuery(['workflow', id], () => getWorkflow(id), { enabled: !!id });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation((payload: WorkflowCreate) => createWorkflow(payload), {
    onSuccess: () => qc.invalidateQueries('workflows'),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation((v: { id: number; payload: Partial<WorkflowCreate> }) => updateWorkflow(v.id, v.payload), {
    onSuccess: (_: any, v: { id: number; payload: Partial<WorkflowCreate> }) => {
      qc.invalidateQueries(['workflow', v.id]);
      qc.invalidateQueries('workflows');
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation((id: number) => deleteWorkflow(id), {
    onSuccess: () => qc.invalidateQueries('workflows'),
  });
}

export function useStartWorkflow() {
  const qc = useQueryClient();
  return useMutation((v: { documentId: number; workflow_id: number; commentaire?: string }) =>
    startWorkflow(v.documentId, { workflow_id: v.workflow_id, commentaire: v.commentaire })
  , {
    onSuccess: (_: any, v: { documentId: number; workflow_id: number; commentaire?: string }) => {
      qc.invalidateQueries(['document-workflows', v.documentId]);
      qc.invalidateQueries('workflow-instances');
    }
  });
}

export function useDocumentWorkflows(documentId: number) {
  return useQuery(['document-workflows', documentId], () => getDocumentWorkflows(documentId), { enabled: !!documentId });
}

export function useWorkflowInstances(params?: { limit?: number; offset?: number }) {
  return useQuery(['workflow-instances', params], () => listInstances(params));
}

export function usePendingApprovals() {
  return useQuery(['workflow-pending-approvals'], () => listPendingApprovals());
}

export function useApproveInstance() {
  const qc = useQueryClient();
  return useMutation((v: { instanceId: number; commentaire?: string }) => approveInstance(v.instanceId, { commentaire: v.commentaire }), {
    onSuccess: (_: any, v: { instanceId: number; commentaire?: string }) => {
      qc.invalidateQueries(['workflow-instance', v.instanceId]);
      qc.invalidateQueries('workflow-pending-approvals');
    }
  });
}

export function useRejectInstance() {
  const qc = useQueryClient();
  return useMutation((v: { instanceId: number; commentaire?: string }) => rejectInstance(v.instanceId, { commentaire: v.commentaire }), {
    onSuccess: (_: any, v: { instanceId: number; commentaire?: string }) => {
      qc.invalidateQueries(['workflow-instance', v.instanceId]);
      qc.invalidateQueries('workflow-pending-approvals');
    }
  });
}

export function useCancelInstance() {
  const qc = useQueryClient();
  return useMutation((instanceId: number) => cancelInstance(instanceId), {
    onSuccess: (_: any, id: number) => {
      qc.invalidateQueries(['workflow-instance', id]);
      qc.invalidateQueries('workflow-instances');
    }
  });
}

export function useWorkflowInstance(instanceId: number) {
  return useQuery(['workflow-instance', instanceId], () => getInstance(instanceId), { enabled: !!instanceId });
}

export function useWorkflowEtapes(workflowId: number) {
  return useQuery(['workflow-etapes', workflowId], () => getWorkflowEtapes(workflowId), { enabled: !!workflowId });
}
