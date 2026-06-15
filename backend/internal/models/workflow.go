package models

import "time"

const (
	WorkflowInstanceInProgress = "EN_COURS"
	WorkflowInstanceApproved   = "APPROUVE"
	WorkflowInstanceRejected   = "REJETE"
	WorkflowInstanceCancelled  = "ANNULE"

	ApprovalDecisionApprove = "APPROUVE"
	ApprovalDecisionReject  = "REJETE"

	StepApprovalSimple   = "SIMPLE"
	StepApprovalMultiple = "MULTIPLE"
	StepApprovalParallel = "PARALLELE"

	WorkflowNameValidation = "Validation Document"
	WorkflowNameArchive    = "Archivage automatique"
)

// WorkflowNameIsProtected empeche suppression / remplacement etapes ou desactivation pour workflows systeme.
func WorkflowNameIsProtected(name string) bool {
	return name == WorkflowNameValidation || name == WorkflowNameArchive
}

// Workflow définition d'un processus de validation.
type Workflow struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	Name        string    `gorm:"size:255;not null;uniqueIndex" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	CreatedByID *uint     `json:"created_by_id,omitempty"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Steps       []WorkflowStep `gorm:"foreignKey:WorkflowID" json:"steps,omitempty"`
}

func (Workflow) TableName() string { return "workflows" }

// WorkflowStep étape ordonnée.
type WorkflowStep struct {
	ID           uint      `gorm:"primarykey" json:"id"`
	WorkflowID   uint      `gorm:"index;not null" json:"workflow_id"`
	Name         string    `gorm:"size:255;not null" json:"name"`
	Description  string    `gorm:"type:text" json:"description"`
	StepOrder    int       `gorm:"not null" json:"step_order"`
	ApprovalType string    `gorm:"size:50;default:SIMPLE" json:"approval_type"`
	CreatedAt    time.Time `json:"created_at"`
	Approvers    []WorkflowApprover `gorm:"foreignKey:StepID" json:"approvers,omitempty"`
}

func (WorkflowStep) TableName() string { return "workflow_steps" }

// WorkflowApprover qui peut valider une étape.
type WorkflowApprover struct {
	ID       uint   `gorm:"primarykey" json:"id"`
	StepID   uint   `gorm:"index;not null" json:"step_id"`
	UserID   *uint  `gorm:"index" json:"user_id,omitempty"`
	RoleName string `gorm:"size:100" json:"role_name,omitempty"`
}

func (WorkflowApprover) TableName() string { return "workflow_approvers" }

// WorkflowInstance exécution sur un document.
type WorkflowInstance struct {
	ID            uint       `gorm:"primarykey" json:"id"`
	WorkflowID    uint       `gorm:"index;not null" json:"workflow_id"`
	DocumentID    uint       `gorm:"index;not null" json:"document_id"`
	InitiatorID   uint       `gorm:"index:idx_workflow_instances_initiator_status_started,priority:1;index;not null" json:"initiator_id"`
	CurrentStepID *uint      `gorm:"index" json:"current_step_id,omitempty"`
	Status        string     `gorm:"size:50;default:EN_COURS;index:idx_workflow_instances_initiator_status_started,priority:2;index" json:"status"`
	Comment       string     `gorm:"type:text" json:"comment"`
	StartedAt     time.Time  `gorm:"index:idx_workflow_instances_initiator_status_started,priority:3" json:"started_at"`
	FinishedAt    *time.Time `json:"finished_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	Workflow    *Workflow     `gorm:"foreignKey:WorkflowID" json:"workflow,omitempty"`
	Document    *Document     `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
	CurrentStep *WorkflowStep `gorm:"foreignKey:CurrentStepID" json:"current_step,omitempty"`
}

func (WorkflowInstance) TableName() string { return "workflow_instances" }

// WorkflowApproval décision sur une étape.
type WorkflowApproval struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	InstanceID  uint      `gorm:"index:idx_workflow_approvals_instance_step_approver,priority:1;index;not null" json:"instance_id"`
	StepID      uint      `gorm:"index:idx_workflow_approvals_instance_step_approver,priority:2;index;not null" json:"step_id"`
	ApproverID  uint      `gorm:"index:idx_workflow_approvals_instance_step_approver,priority:3;index;not null" json:"approver_id"`
	Decision    string    `gorm:"size:50;not null" json:"decision"`
	Comment     string    `gorm:"type:text" json:"comment"`
	DecidedAt   time.Time `json:"decided_at"`

	Step     *WorkflowStep `gorm:"foreignKey:StepID" json:"step,omitempty"`
	Approver *User         `gorm:"foreignKey:ApproverID" json:"approver,omitempty"`
}

func (WorkflowApproval) TableName() string { return "workflow_approvals" }
