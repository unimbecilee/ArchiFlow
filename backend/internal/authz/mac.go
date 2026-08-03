package authz

import (
	"strings"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
)

// MACDeny returns true if user must not access doc (classification / department).
func MACDeny(doc *models.Document, userID uint, role string, userRepo repository.UserRepository) bool {
	if models.RoleIsAdmin(role) || doc.OwnerID == userID {
		return false
	}
	user, err := userRepo.GetByID(userID)
	if err != nil || user == nil {
		return true
	}
	classif := doc.Classification
	if classif == "" {
		classif = models.ClassificationInternal
	}
	clearance := user.ClearanceLevel
	if clearance == "" {
		clearance = models.ClassificationInternal
	}
	if classif == models.ClassificationConfidential {
		return true
	}
	if models.ClearanceRank(clearance) < models.ClearanceRank(classif) {
		return true
	}
	if doc.Department != "" && user.Department != "" &&
		!strings.EqualFold(doc.Department, user.Department) {
		return true
	}
	return false
}
