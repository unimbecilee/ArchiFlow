package authz

import (
	"testing"

	"archiflow/backend/internal/models"
)

func TestApplyAccessPoliciesDenyFirst(t *testing.T) {
	user := &models.User{ID: 1, Department: "IT"}
	doc := &models.Document{OwnerID: 2, Department: "IT"}
	policies := []models.AccessPolicy{
		{Active: true, Effect: "allow", Actions: `["read"]`, Condition: "", Priority: 10},
		{Active: true, Effect: "deny", Actions: `["read"]`, Condition: `{"attr":"doc.department","op":"eq","value":"IT"}`, Priority: 20},
	}
	if ApplyAccessPolicies(policies, "read", user, doc) {
		t.Fatal("deny should win")
	}
	policies = policies[:1]
	if !ApplyAccessPolicies(policies, "read", user, doc) {
		t.Fatal("allow path should pass when no deny")
	}
}

func TestSatisfiesReadViaDownload(t *testing.T) {
	if !Satisfies([]string{models.PermDownload}, ActionRead) {
		t.Fatal("download should satisfy read")
	}
	if Satisfies([]string{models.PermRead}, ActionWrite) {
		t.Fatal("read must not satisfy write")
	}
}
