package dto

type AdminWorkflowApproverInput struct {
	UserID   *uint  `json:"user_id" validate:"omitempty"`
	RoleName string `json:"role_name" validate:"omitempty,max=64"`
}

type AdminWorkflowStepInput struct {
	Name         string                       `json:"name" validate:"required,max=200"`
	Description  string                       `json:"description" validate:"omitempty,max=2000"`
	StepOrder    int                          `json:"step_order" validate:"required,gte=1"`
	ApprovalType string                       `json:"approval_type" validate:"required,oneof=any all"`
	Approvers    []AdminWorkflowApproverInput `json:"approvers" validate:"omitempty,dive"`
}

type AdminCreateWorkflowRequest struct {
	Name        string                   `json:"name" validate:"required,max=200"`
	Description string                   `json:"description" validate:"omitempty,max=2000"`
	IsActive    *bool                    `json:"is_active"`
	Steps       []AdminWorkflowStepInput `json:"steps" validate:"required,min=1,dive"`
}

type AdminUpdateWorkflowRequest struct {
	Name        *string                   `json:"name" validate:"omitempty,max=200"`
	Description *string                   `json:"description" validate:"omitempty,max=2000"`
	IsActive    *bool                     `json:"is_active"`
	Steps       *[]AdminWorkflowStepInput `json:"steps" validate:"omitempty,dive"`
}
