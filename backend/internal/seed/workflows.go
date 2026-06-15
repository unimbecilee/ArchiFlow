package seed

import (
	"log"

	"archiflow/backend/internal/models"

	"gorm.io/gorm"
)

// DefaultWorkflows crée les workflows système si absents.
func DefaultWorkflows(db *gorm.DB) {
	var count int64
	db.Model(&models.Workflow{}).Count(&count)
	if count > 0 {
		return
	}

	validation := models.Workflow{
		Name:        models.WorkflowNameValidation,
		Description: "Validation 2 étapes : responsable puis administrateur",
		IsActive:    true,
		Steps: []models.WorkflowStep{
			{
				Name:         "Responsable",
				Description:  "Première validation",
				StepOrder:    1,
				ApprovalType: models.StepApprovalSimple,
				Approvers: []models.WorkflowApprover{
					{RoleName: models.RoleManager},
					{RoleName: models.RoleValidator},
					{RoleName: models.RoleAdmin},
				},
			},
			{
				Name:         "Administrateur",
				Description:  "Validation finale",
				StepOrder:    2,
				ApprovalType: models.StepApprovalSimple,
				Approvers: []models.WorkflowApprover{
					{RoleName: "admin"},
				},
			},
		},
	}
	if err := db.Create(&validation).Error; err != nil {
		log.Printf("seed validation workflow: %v", err)
	}

	archive := models.Workflow{
		Name:        models.WorkflowNameArchive,
		Description: "Archivage après validation complète",
		IsActive:    true,
		Steps: []models.WorkflowStep{
			{
				Name:         "Validation archivage",
				StepOrder:    1,
				ApprovalType: models.StepApprovalSimple,
				Approvers: []models.WorkflowApprover{
					{RoleName: "admin"},
				},
			},
		},
	}
	if err := db.Create(&archive).Error; err != nil {
		log.Printf("seed archive workflow: %v", err)
	}

	log.Println("✅ Default workflows seeded")
}

// EnsureValidationWorkflowApprovers ajoute le role validator a l'etape 1 si absent (bases existantes).
func EnsureValidationWorkflowApprovers(db *gorm.DB) {
	var wf models.Workflow
	if err := db.Preload("Steps.Approvers").Where("name = ?", models.WorkflowNameValidation).First(&wf).Error; err != nil {
		return
	}
	var step1 *models.WorkflowStep
	for i := range wf.Steps {
		if wf.Steps[i].StepOrder == 1 {
			step1 = &wf.Steps[i]
			break
		}
	}
	if step1 == nil {
		return
	}
	hasValidator, hasManager := false, false
	for _, a := range step1.Approvers {
		if a.RoleName == models.RoleValidator {
			hasValidator = true
		}
		if a.RoleName == models.RoleManager {
			hasManager = true
		}
	}
	if !hasValidator {
		if err := db.Create(&models.WorkflowApprover{
			StepID:   step1.ID,
			RoleName: models.RoleValidator,
		}).Error; err != nil {
			log.Printf("seed validator approver: %v", err)
		} else {
			log.Println("✅ Added validator approver to validation workflow step 1")
		}
	}
	if !hasManager {
		if err := db.Create(&models.WorkflowApprover{
			StepID:   step1.ID,
			RoleName: models.RoleManager,
		}).Error; err != nil {
			log.Printf("seed manager approver: %v", err)
		} else {
			log.Println("✅ Added manager approver to validation workflow step 1")
		}
	}
}
