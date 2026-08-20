package models

const (
	RoleAdmin     = "admin"
	RoleManager   = "manager"
	RoleUser      = "user"
	RoleValidator = "validator"
	RoleArchivist = "archivist"
)

func IsValidRole(role string) bool {
	switch role {
	case RoleAdmin, RoleManager, RoleUser, RoleValidator, RoleArchivist:
		return true
	default:
		return false
	}
}

func RoleIsAdmin(role string) bool {
	return role == RoleAdmin
}

func RoleCanViewOrgDocuments(role string) bool {
	return role == RoleAdmin || role == RoleArchivist
}

func RoleCanViewOrgWorkflows(role string) bool {
	return role == RoleAdmin || role == RoleArchivist
}

// RoleMatchesStepApprover indique si userRole peut valider une etape assignee a stepRole.
func RoleMatchesStepApprover(stepRole, userRole string) bool {
	if stepRole == "" {
		return false
	}
	if stepRole == userRole {
		return true
	}
	if userRole == RoleAdmin {
		return true
	}
	if stepRole == RoleManager && userRole == RoleAdmin {
		return true
	}
	return false
}

type RoleCapabilities struct {
	AdminPanel       bool `json:"admin_panel"`
	ApproveWorkflows bool `json:"approve_workflows"`
	ViewOrgDocuments bool `json:"view_org_documents"`
	ViewOrgWorkflows bool `json:"view_org_workflows"`
	WriteDocuments   bool `json:"write_documents"`
}

func CapabilitiesForRole(role string) RoleCapabilities {
	validator := role == RoleValidator
	admin := RoleIsAdmin(role)
	return RoleCapabilities{
		AdminPanel:       admin,
		ApproveWorkflows: admin || role == RoleManager || validator,
		ViewOrgDocuments: RoleCanViewOrgDocuments(role),
		ViewOrgWorkflows: RoleCanViewOrgWorkflows(role),
		// Archiviste = user + vue org : ecriture sur son coffre (ownership),
		// pas d'ecriture de contenu sur les docs d'autrui (CanAccess).
		WriteDocuments: true,
	}
}
