package services

import (
	"testing"

	"archiflow/backend/internal/models"
)

func TestStepCompleteRule(t *testing.T) {
	// Mirrors isStepComplete decision rules without DB.
	cases := []struct {
		approvalType string
		approved     int64
		total        int64
		want         bool
	}{
		{models.StepApprovalSimple, 0, 1, false},
		{models.StepApprovalSimple, 1, 1, true},
		{models.StepApprovalMultiple, 0, 2, false},
		{models.StepApprovalMultiple, 1, 2, false},
		{models.StepApprovalMultiple, 2, 2, true},
		{models.StepApprovalParallel, 0, 0, false}, // no approvers → need >=1
		{models.StepApprovalParallel, 1, 0, true},
	}
	for _, tc := range cases {
		got := stepCompleteRule(tc.approvalType, tc.approved, tc.total)
		if got != tc.want {
			t.Fatalf("%s approved=%d total=%d: got %v want %v",
				tc.approvalType, tc.approved, tc.total, got, tc.want)
		}
	}
}

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
