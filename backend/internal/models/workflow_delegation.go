package models

import "time"

type WorkflowDelegation struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	DelegatorID uint     `gorm:"index;not null" json:"delegator_id"`
	DelegateID  uint     `gorm:"index;not null" json:"delegate_id"`
	StartAt    time.Time `json:"start_at"`
	EndAt      time.Time `json:"end_at"`
	Reason     string    `gorm:"size:255" json:"reason"`
	CreatedAt  time.Time `json:"created_at"`
}

func (WorkflowDelegation) TableName() string { return "workflow_delegations" }

type WorkflowSLA struct {
	ID              uint       `gorm:"primarykey" json:"id"`
	WorkflowID      uint       `gorm:"index" json:"workflow_id"`
	StepID          *uint      `gorm:"index" json:"step_id,omitempty"`
	MaxDurationHours int       `gorm:"not null" json:"max_duration_hours"`
	ReminderHours   int        `gorm:"default:24" json:"reminder_hours"`
	EscalateToID    *uint      `json:"escalate_to_id,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

func (WorkflowSLA) TableName() string { return "workflow_slas" }
