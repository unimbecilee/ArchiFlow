package services

import (
	"testing"

	"archiflow/backend/internal/models"
)

func TestCanApproveFromStep(t *testing.T) {
	uid := uint(42)
	step := &models.WorkflowStep{
		Approvers: []models.WorkflowApprover{
			{UserID: &uid},
			{RoleName: models.RoleManager},
		},
	}
	if !canApproveFromStep(step, 42, "user") {
		t.Fatal("expected user id match")
	}
	if !canApproveFromStep(step, 99, models.RoleManager) {
		t.Fatal("expected manager role match")
	}
	if canApproveFromStep(step, 99, "user") {
		t.Fatal("expected reject unrelated user")
	}
	if canApproveFromStep(nil, 42, "admin") {
		t.Fatal("expected nil step reject")
	}
}
