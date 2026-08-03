package authz

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"archiflow/backend/internal/models"
)

// PolicyMatchesAction checks if stored actions JSON includes the API action.
func PolicyMatchesAction(raw, action string) bool {
	if action == "comment" {
		if PolicyMatchesAction(raw, "read") {
			return true
		}
	}
	if raw == "" {
		return true
	}
	var actions []string
	if err := json.Unmarshal([]byte(raw), &actions); err != nil {
		return strings.Contains(raw, action)
	}
	for _, a := range actions {
		if a == action || a == "*" {
			return true
		}
	}
	return false
}

// EvalPolicyCondition evaluates a single ABAC condition JSON object.
func EvalPolicyCondition(raw string, user *models.User, doc *models.Document) bool {
	if strings.TrimSpace(raw) == "" {
		return true
	}
	var cond map[string]any
	if err := json.Unmarshal([]byte(raw), &cond); err != nil {
		return false
	}
	attr, _ := cond["attr"].(string)
	op, _ := cond["op"].(string)
	val, _ := cond["value"].(string)

	left := ""
	switch attr {
	case "doc.department":
		left = doc.Department
	case "user.department":
		left = user.Department
	case "doc.classification":
		left = doc.Classification
	case "user.clearance":
		left = user.ClearanceLevel
	case "doc.owner_id":
		left = strconv.FormatUint(uint64(doc.OwnerID), 10)
	default:
		return false
	}
	right := val
	if strings.HasPrefix(val, "$user.") {
		switch val {
		case "$user.department":
			right = user.Department
		case "$user.clearance":
			right = user.ClearanceLevel
		case "$user.id":
			right = strconv.FormatUint(uint64(user.ID), 10)
		}
	}
	switch op {
	case "eq", "==", "":
		return strings.EqualFold(left, right)
	case "neq", "!=":
		return !strings.EqualFold(left, right)
	default:
		return false
	}
}

// ApplyAccessPolicies returns false if a deny policy matches, true if still allowed.
// Policies must be sorted by priority ASC. Deny wins over later allow; allow does not override deny.
func ApplyAccessPolicies(policies []models.AccessPolicy, action string, user *models.User, doc *models.Document) bool {
	for _, pol := range policies {
		if !pol.Active {
			continue
		}
		if !PolicyMatchesAction(pol.Actions, action) {
			continue
		}
		if !EvalPolicyCondition(pol.Condition, user, doc) {
			continue
		}
		if strings.EqualFold(pol.Effect, "deny") {
			return false
		}
	}
	return true
}

// ValidatePolicyConditionJSON ensures condition is empty or valid JSON object with known attr.
func ValidatePolicyConditionJSON(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	var cond map[string]any
	if err := json.Unmarshal([]byte(raw), &cond); err != nil {
		return err
	}
	attr, _ := cond["attr"].(string)
	switch attr {
	case "doc.department", "user.department", "doc.classification", "user.clearance", "doc.owner_id":
		return nil
	default:
		return fmt.Errorf("unknown policy attr: %s", attr)
	}
}
