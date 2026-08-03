package authz

import "archiflow/backend/internal/models"

// Action identifies an authorization check on a document.
type Action string

const (
	ActionRead     Action = "read"
	ActionWrite    Action = "write"
	ActionShare    Action = "share"
	ActionDownload Action = "download"
	ActionComment  Action = "comment"
)

// PolicyAction returns the PolicyService action string (read/write/share/comment).
func PolicyAction(a Action) string {
	switch a {
	case ActionWrite:
		return "write"
	case ActionShare:
		return "share"
	case ActionComment:
		return "comment"
	default:
		return "read"
	}
}

// RequiredPerm returns the ACL permission string needed for this action.
func RequiredPerm(a Action) string {
	switch a {
	case ActionWrite:
		return models.PermWrite
	case ActionShare:
		return models.PermShare
	case ActionComment:
		return models.PermComment
	case ActionDownload:
		return models.PermDownload
	default:
		return models.PermRead
	}
}

// Satisfies checks if granted ACL permissions allow the action.
func Satisfies(granted []string, a Action) bool {
	need := RequiredPerm(a)
	for _, p := range granted {
		if p == need {
			return true
		}
	}
	if a == ActionRead {
		for _, p := range granted {
			if p == models.PermDownload || p == models.PermRead {
				return true
			}
		}
	}
	if a == ActionDownload {
		for _, p := range granted {
			if p == models.PermDownload {
				return true
			}
		}
	}
	return false
}
