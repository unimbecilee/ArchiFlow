package dto

type AdminWorkflowApproverInput struct {
	UserID   *uint  `json:"user_id"`
	RoleName string `json:"role_name"`
}

type AdminWorkflowStepInput struct {
	Name         string                         `json:"name"`
	Description  string                         `json:"description"`
	StepOrder    int                            `json:"step_order"`
	ApprovalType string                         `json:"approval_type"`
	Approvers    []AdminWorkflowApproverInput   `json:"approvers"`
}

type AdminCreateWorkflowRequest struct {
	Name        string                   `json:"name"`
	Description string                   `json:"description"`
	IsActive    *bool                    `json:"is_active"`
	Steps       []AdminWorkflowStepInput `json:"steps"`
}

type AdminUpdateWorkflowRequest struct {
	Name        *string                   `json:"name"`
	Description *string                   `json:"description"`
	IsActive    *bool                     `json:"is_active"`
	Steps       *[]AdminWorkflowStepInput `json:"steps"`
}
