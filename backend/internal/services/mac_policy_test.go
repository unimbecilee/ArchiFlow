package services

import (
	"errors"
	"testing"

	"archiflow/backend/internal/authz"
	"archiflow/backend/internal/models"
)

// stubUserRepo: only GetByID wired — enough for MAC unit tests.
type stubUserRepo struct {
	users map[uint]*models.User
}

func (s *stubUserRepo) Create(*models.User) error                       { return nil }
func (s *stubUserRepo) GetByID(id uint) (*models.User, error) {
	u, ok := s.users[id]
	if !ok {
		return nil, errors.New("not found")
	}
	return u, nil
}
func (s *stubUserRepo) GetByEmail(string) (*models.User, error)         { return nil, errors.New("n/a") }
func (s *stubUserRepo) Update(*models.User) error                       { return nil }
func (s *stubUserRepo) UpdateLastLogin(uint) error                      { return nil }
func (s *stubUserRepo) Delete(uint) error                               { return nil }
func (s *stubUserRepo) List(int, int) ([]models.User, error)            { return nil, nil }
func (s *stubUserRepo) ListByRole(string) ([]models.User, error)        { return nil, nil }
func (s *stubUserRepo) ListAll(int, int) ([]models.User, error)         { return nil, nil }
func (s *stubUserRepo) UpdateRole(uint, string) error                   { return nil }
func (s *stubUserRepo) UpdateActive(uint, bool) error                   { return nil }
func (s *stubUserRepo) IncrementTokenVersion(uint) error                { return nil }
func (s *stubUserRepo) GetTokenVersion(uint) (uint, error)              { return 0, nil }
func (s *stubUserRepo) Count() (int64, error)                           { return 0, nil }

func TestMacAndDepartmentDeny(t *testing.T) {
	repo := &stubUserRepo{users: map[uint]*models.User{
		1: {ID: 1, Department: "IT", ClearanceLevel: models.ClassificationInternal},
		2: {ID: 2, Department: "RH", ClearanceLevel: models.ClassificationPublic},
		3: {ID: 3, Department: "IT", ClearanceLevel: models.ClassificationConfidential},
	}}

	docOwned := &models.Document{
		OwnerID: 1, Department: "IT", Classification: models.ClassificationConfidential,
	}
	docITInternal := &models.Document{
		OwnerID: 99, Department: "IT", Classification: models.ClassificationInternal,
	}
	docConfidential := &models.Document{
		OwnerID: 99, Department: "IT", Classification: models.ClassificationConfidential,
	}
	docRH := &models.Document{
		OwnerID: 99, Department: "RH", Classification: models.ClassificationInternal,
	}

	cases := []struct {
		name   string
		doc    *models.Document
		uid    uint
		role   string
		deny   bool
	}{
		{"owner bypass confidential", docOwned, 1, "user", false},
		{"admin bypass confidential", docConfidential, 2, "admin", false},
		{"non-owner confidential always deny", docConfidential, 1, "user", true},
		{"same dept + enough clearance", docITInternal, 1, "user", false},
		{"clearance too low", docITInternal, 2, "user", true},
		{"dept mismatch", docRH, 1, "user", true},
		{"high clearance same dept", docITInternal, 3, "user", false},
		{"missing user deny", docITInternal, 404, "user", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := authz.MACDeny(tc.doc, tc.uid, tc.role, repo)
			if got != tc.deny {
				t.Fatalf("deny=%v want %v", got, tc.deny)
			}
		})
	}
}

func TestClearanceRankTable(t *testing.T) {
	if models.ClearanceRank(models.ClassificationPublic) != 1 {
		t.Fatal("PUBLIC rank")
	}
	if models.ClearanceRank(models.ClassificationInternal) != 2 {
		t.Fatal("INTERNE rank")
	}
	if models.ClearanceRank(models.ClassificationConfidential) != 3 {
		t.Fatal("CONFIDENTIEL rank")
	}
	if models.ClearanceRank("unknown") != 2 {
		t.Fatal("default rank should be INTERNE")
	}
	if !(models.ClearanceRank(models.ClassificationPublic) <
		models.ClearanceRank(models.ClassificationInternal) &&
		models.ClearanceRank(models.ClassificationInternal) <
			models.ClearanceRank(models.ClassificationConfidential)) {
		t.Fatal("rank order broken")
	}
}

func TestEvalPolicyConditionNeqAndOwner(t *testing.T) {
	user := &models.User{ID: 7, Department: "IT", ClearanceLevel: models.ClassificationInternal}
	doc := &models.Document{OwnerID: 7, Department: "RH", Classification: models.ClassificationInternal}

	if !authz.EvalPolicyCondition(`{"attr":"doc.department","op":"neq","value":"$user.department"}`, user, doc) {
		t.Fatal("expected neq match")
	}
	if !authz.EvalPolicyCondition(`{"attr":"doc.owner_id","op":"eq","value":"$user.id"}`, user, doc) {
		t.Fatal("expected owner_id match")
	}
	if authz.EvalPolicyCondition(`{"attr":"unknown","op":"eq","value":"x"}`, user, doc) {
		t.Fatal("unknown attr must fail")
	}
}
