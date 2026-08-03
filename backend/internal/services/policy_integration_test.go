package services

import (
	"testing"

	"archiflow/backend/internal/authz"
	"archiflow/backend/internal/models"
)

// Smoke: deny policy blocks after Satisfies would pass (integration with authz.ApplyAccessPolicies).
func TestAccessPolicyDenyBlocksCrossDepartment(t *testing.T) {
	user := &models.User{ID: 2, Department: "RH"}
	doc := &models.Document{OwnerID: 99, Department: "IT", Classification: models.ClassificationInternal}
	policies := []models.AccessPolicy{
		{
			Active:    true,
			Effect:    "deny",
			Priority:  10,
			Actions:   `["read"]`,
			Condition: `{"attr":"doc.department","op":"neq","value":"$user.department"}`,
		},
	}
	if authz.ApplyAccessPolicies(policies, authz.PolicyAction(authz.ActionRead), user, doc) {
		t.Fatal("expected deny for cross-department read")
	}
	userSame := &models.User{ID: 2, Department: "IT"}
	if !authz.ApplyAccessPolicies(policies, authz.PolicyAction(authz.ActionRead), userSame, doc) {
		t.Fatal("expected allow when departments match")
	}
}

func TestAuthzSatisfiesShareAndWrite(t *testing.T) {
	if !authz.Satisfies([]string{models.PermShare}, authz.ActionShare) {
		t.Fatal("share perm")
	}
	if authz.Satisfies([]string{models.PermRead}, authz.ActionWrite) {
		t.Fatal("read must not grant write")
	}
}
