package services

import (
	"testing"

	"archiflow/backend/internal/models"
)

func TestClearanceRank(t *testing.T) {
	if models.ClearanceRank(models.ClassificationPublic) >= models.ClearanceRank(models.ClassificationConfidential) {
		t.Fatal("PUBLIC should rank below CONFIDENTIEL")
	}
}

func TestPolicyMatchesAction(t *testing.T) {
	if !policyMatchesAction(`["read","write"]`, ActionRead) {
		t.Fatal("expected read match")
	}
	if policyMatchesAction(`["write"]`, ActionRead) {
		t.Fatal("expected no read match")
	}
	if !policyMatchesAction(`["*"]`, ActionShare) {
		t.Fatal("expected wildcard")
	}
}

func TestEvalPolicyConditionEq(t *testing.T) {
	user := &models.User{ID: 1, Department: "IT", ClearanceLevel: models.ClassificationInternal}
	doc := &models.Document{OwnerID: 2, Department: "IT", Classification: models.ClassificationInternal}
	ok := evalPolicyCondition(`{"attr":"doc.department","op":"eq","value":"$user.department"}`, user, doc)
	if !ok {
		t.Fatal("expected department match")
	}
	doc.Department = "RH"
	if evalPolicyCondition(`{"attr":"doc.department","op":"eq","value":"$user.department"}`, user, doc) {
		t.Fatal("expected department mismatch")
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
