export interface WorkflowInstance {
  id: number;
  workflow_id: number;
  workflow_nom?: string;
  document_id: number;
  document_titre?: string;
  initiator_id: number;
  current_step_id?: number | null;
  etape_courante_nom?: string;
  en_attente_label?: string;
  statut: string;
  status?: string;
  commentaire?: string;
  date_debut?: string;
  date_fin?: string | null;
}

export interface WorkflowApprovalRecord {
  id: number;
  decision: string;
  commentaire?: string;
  date: string;
  step_id?: number;
  etape_nom?: string;
  approver_email?: string;
}

export interface WorkflowStepProgress {
  id: number;
  nom: string;
  ordre: number;
  approval_type?: string;
  statut: string;
  decisions?: number;
  date?: string;
}

export interface WorkflowInstanceDetail extends WorkflowInstance {
  approvals?: WorkflowApprovalRecord[];
  initiator_email?: string;
  etapes?: WorkflowStepProgress[];
}

export interface WorkflowDefinition {
  id: number;
  name: string;
  description?: string;
  is_active?: boolean;
  steps?: { id: number; name: string; step_order: number }[];
}

export interface WorkflowApproverRow {
  id: number;
  step_id: number;
  user_id?: number | null;
  role_name?: string;
}

export interface WorkflowStepDetail {
  id: number;
  workflow_id: number;
  name: string;
  description?: string;
  step_order: number;
  approval_type: string;
  approvers?: WorkflowApproverRow[];
}

export interface WorkflowFullDefinition {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  steps?: WorkflowStepDetail[];
}

export interface AdminWorkflowListRow {
  workflow: WorkflowFullDefinition;
  protected: boolean;
  instance_count: number;
}

export interface AdminWorkflowDetailPayload {
  workflow: WorkflowFullDefinition;
  protected: boolean;
  instance_count: number;
}

export type AdminWorkflowApproverInput = {
  user_id?: number | null;
  role_name: string;
};

export type AdminWorkflowStepInput = {
  name: string;
  description: string;
  step_order: number;
  approval_type: string;
  approvers: AdminWorkflowApproverInput[];
};

export type AdminCreateWorkflowPayload = {
  name: string;
  description: string;
  is_active: boolean;
  steps: AdminWorkflowStepInput[];
};

export type AdminUpdateWorkflowPayload = {
  name?: string;
  description?: string;
  is_active?: boolean;
  steps?: AdminWorkflowStepInput[];
};

export interface ValidationContext {
  status: string;
  current_version_number: number;
  rejected_at_version?: number | null;
  can_restart_validation: boolean;
  rejection_comment?: string;
  rejection_date?: string | null;
  rejected_by_email?: string;
}
