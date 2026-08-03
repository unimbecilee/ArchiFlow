package services

import (
	"testing"

	"archiflow/backend/internal/authz"
	"archiflow/backend/internal/models"
)

func TestClearanceRank(t *testing.T) {
	if models.ClearanceRank(models.ClassificationPublic) >= models.ClearanceRank(models.ClassificationConfidential) {
		t.Fatal("PUBLIC should rank below CONFIDENTIEL")
	}
}

func TestPolicyMatchesActionJSON(t *testing.T) {
	raw := `["read","write"]`
	if !authz.PolicyMatchesAction(raw, "read") {
		t.Fatal("read")
	}
	if authz.PolicyMatchesAction(raw, "share") {
		t.Fatal("no share")
	}
	if !authz.PolicyMatchesAction("", "write") {
		t.Fatal("empty actions = all")
	}
}

func TestEvalPolicyConditionDepartment(t *testing.T) {
	user := &models.User{Department: "IT"}
	doc := &models.Document{Department: "RH"}
	cond := `{"attr":"doc.department","op":"eq","value":"$user.department"}`
	if authz.EvalPolicyCondition(cond, user, doc) {
		t.Fatal("departments differ")
	}
	user.Department = "RH"
	if !authz.EvalPolicyCondition(cond, user, doc) {
		t.Fatal("departments match")
	}
}

func TestHashIdempotencyStable(t *testing.T) {
	a := hashIdempotency(1, "b", "k", 10)
	b := hashIdempotency(1, "b", "k", 10)
	if a != b || a == "" {
		t.Fatalf("idempotency not stable: %s vs %s", a, b)
	}
	c := hashIdempotency(1, "b", "k", 11)
	if a == c {
		t.Fatal("different size should change key")
	}
}
