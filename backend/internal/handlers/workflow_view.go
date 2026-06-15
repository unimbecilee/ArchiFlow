package handlers

import (
	"strings"

	"archiflow/backend/internal/models"
)

var roleLabelsFR = map[string]string{
	models.RoleManager:   "Responsable",
	models.RoleValidator: "Validateur",
	models.RoleAdmin:     "Administrateur",
	models.RoleUser:      "Utilisateur",
	models.RoleArchivist: "Archiviste",
}

func waitingLabelForStep(step *models.WorkflowStep) string {
	if step == nil {
		return ""
	}
	seen := make(map[string]struct{})
	labels := make([]string, 0, len(step.Approvers))
	for _, a := range step.Approvers {
		key := a.RoleName
		if key == "" && a.UserID != nil {
			key = "utilisateur"
		}
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		if lbl, ok := roleLabelsFR[key]; ok {
			labels = append(labels, lbl)
		} else {
			labels = append(labels, key)
		}
	}
	if len(labels) == 0 {
		return "validation « " + step.Name + " »"
	}
	return "validation « " + step.Name + " » — " + strings.Join(labels, ", ")
}
