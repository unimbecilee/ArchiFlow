package repository

import (
	"time"

	"archiflow/backend/internal/models"

	"gorm.io/gorm"
)

type WorkflowRepository struct {
	db *gorm.DB
}

func NewWorkflowRepository(db *gorm.DB) *WorkflowRepository {
	return &WorkflowRepository{db: db}
}

func (r *WorkflowRepository) FindWorkflowByName(name string) (*models.Workflow, error) {
	var w models.Workflow
	err := r.db.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("step_order ASC")
	}).Preload("Steps.Approvers").Where("name = ?", name).First(&w).Error
	return &w, err
}

func (r *WorkflowRepository) ListWorkflows() ([]models.Workflow, error) {
	var rows []models.Workflow
	err := r.db.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("step_order ASC")
	}).Where("is_active = ?", true).Find(&rows).Error
	return rows, err
}

// ListAllWorkflows inclut inactifs (admin).
func (r *WorkflowRepository) ListAllWorkflows() ([]models.Workflow, error) {
	var rows []models.Workflow
	err := r.db.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("step_order ASC")
	}).Preload("Steps.Approvers").Order("name ASC").Find(&rows).Error
	return rows, err
}

func (r *WorkflowRepository) CountInstancesForWorkflow(workflowID uint) (int64, error) {
	var n int64
	err := r.db.Model(&models.WorkflowInstance{}).Where("workflow_id = ?", workflowID).Count(&n).Error
	return n, err
}

func (r *WorkflowRepository) WorkflowNameTaken(name string, excludeID uint) (bool, error) {
	q := r.db.Model(&models.Workflow{}).Where("name = ?", name)
	if excludeID > 0 {
		q = q.Where("id <> ?", excludeID)
	}
	var n int64
	err := q.Count(&n).Error
	return n > 0, err
}

func (r *WorkflowRepository) UpdateWorkflowFields(id uint, name, description string, isActive bool) error {
	return r.db.Model(&models.Workflow{}).Where("id = ?", id).Updates(map[string]any{
		"name":        name,
		"description": description,
		"is_active":   isActive,
	}).Error
}

func (r *WorkflowRepository) ReplaceWorkflowSteps(workflowID uint, steps []models.WorkflowStep) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var stepIDs []uint
		if err := tx.Model(&models.WorkflowStep{}).Where("workflow_id = ?", workflowID).Pluck("id", &stepIDs).Error; err != nil {
			return err
		}
		if len(stepIDs) > 0 {
			if err := tx.Where("step_id IN ?", stepIDs).Delete(&models.WorkflowApprover{}).Error; err != nil {
				return err
			}
			if err := tx.Where("workflow_id = ?", workflowID).Delete(&models.WorkflowStep{}).Error; err != nil {
				return err
			}
		}
		for i := range steps {
			st := &steps[i]
			st.ID = 0
			st.WorkflowID = workflowID
			for j := range st.Approvers {
				st.Approvers[j].ID = 0
				st.Approvers[j].StepID = 0
			}
			if err := tx.Create(st).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *WorkflowRepository) DeleteWorkflow(workflowID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var stepIDs []uint
		if err := tx.Model(&models.WorkflowStep{}).Where("workflow_id = ?", workflowID).Pluck("id", &stepIDs).Error; err != nil {
			return err
		}
		if len(stepIDs) > 0 {
			if err := tx.Where("step_id IN ?", stepIDs).Delete(&models.WorkflowApprover{}).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("workflow_id = ?", workflowID).Delete(&models.WorkflowStep{}).Error; err != nil {
			return err
		}
		return tx.Delete(&models.Workflow{}, workflowID).Error
	})
}

func (r *WorkflowRepository) GetWorkflow(id uint) (*models.Workflow, error) {
	var w models.Workflow
	err := r.db.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("step_order ASC")
	}).Preload("Steps.Approvers").First(&w, id).Error
	return &w, err
}

func (r *WorkflowRepository) CreateWorkflow(w *models.Workflow) error {
	return r.db.Create(w).Error
}

func (r *WorkflowRepository) CreateInstance(inst *models.WorkflowInstance) error {
	return r.db.Create(inst).Error
}

func (r *WorkflowRepository) SaveInstance(inst *models.WorkflowInstance) error {
	return r.db.Save(inst).Error
}

// UpdateInstanceCurrentStep évite GORM Save qui réécrit current_step_id depuis CurrentStep preload.
func (r *WorkflowRepository) UpdateInstanceCurrentStep(instanceID uint, stepID *uint) error {
	return r.db.Model(&models.WorkflowInstance{}).Where("id = ?", instanceID).
		Update("current_step_id", stepID).Error
}

func (r *WorkflowRepository) UpdateInstanceFinished(instanceID uint, status string, finishedAt time.Time) error {
	return r.db.Model(&models.WorkflowInstance{}).Where("id = ?", instanceID).Updates(map[string]any{
		"status":            status,
		"finished_at":       finishedAt,
		"current_step_id":   nil,
	}).Error
}

func (r *WorkflowRepository) UpdateInstanceCancelled(instanceID uint, finishedAt time.Time) error {
	return r.db.Model(&models.WorkflowInstance{}).Where("id = ?", instanceID).Updates(map[string]any{
		"status":          models.WorkflowInstanceCancelled,
		"finished_at":     finishedAt,
		"current_step_id": nil,
	}).Error
}

func (r *WorkflowRepository) GetInstance(id uint) (*models.WorkflowInstance, error) {
	var inst models.WorkflowInstance
	err := r.db.Preload("Workflow").Preload("Document").Preload("CurrentStep.Approvers").
		First(&inst, id).Error
	return &inst, err
}

func (r *WorkflowRepository) GetStep(id uint) (*models.WorkflowStep, error) {
	var s models.WorkflowStep
	err := r.db.Preload("Approvers").First(&s, id).Error
	return &s, err
}

func (r *WorkflowRepository) GetFirstStep(workflowID uint) (*models.WorkflowStep, error) {
	var s models.WorkflowStep
	err := r.db.Where("workflow_id = ?", workflowID).Order("step_order ASC").First(&s).Error
	return &s, err
}

func (r *WorkflowRepository) GetNextStep(workflowID uint, afterOrder int) (*models.WorkflowStep, error) {
	var s models.WorkflowStep
	err := r.db.Where("workflow_id = ? AND step_order > ?", workflowID, afterOrder).
		Order("step_order ASC").First(&s).Error
	return &s, err
}

func (r *WorkflowRepository) CreateApproval(a *models.WorkflowApproval) error {
	return r.db.Create(a).Error
}

func (r *WorkflowRepository) CountApprovals(instanceID, stepID uint, decision string) (int64, error) {
	var n int64
	q := r.db.Model(&models.WorkflowApproval{}).Where("instance_id = ? AND step_id = ?", instanceID, stepID)
	if decision != "" {
		q = q.Where("decision = ?", decision)
	}
	return n, q.Count(&n).Error
}

func (r *WorkflowRepository) HasUserApproved(instanceID, stepID, userID uint) (bool, error) {
	var n int64
	err := r.db.Model(&models.WorkflowApproval{}).
		Where("instance_id = ? AND step_id = ? AND approver_id = ?", instanceID, stepID, userID).
		Count(&n).Error
	return n > 0, err
}

func (r *WorkflowRepository) ListInstancesByStatus(status string, initiatorID *uint, limit int) ([]models.WorkflowInstance, error) {
	var rows []models.WorkflowInstance
	q := r.db.Preload("Workflow").Preload("Document").Preload("CurrentStep.Approvers")
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if initiatorID != nil {
		q = q.Where("initiator_id = ?", *initiatorID)
	}
	if limit > 0 {
		q = q.Limit(limit)
	}
	order := "started_at DESC"
	if status != "" && status != models.WorkflowInstanceInProgress {
		order = "COALESCE(finished_at, started_at) DESC"
	}
	return rows, q.Order(order).Find(&rows).Error
}

func (r *WorkflowRepository) ListCompletedInstances(initiatorID *uint, statuses []string, limit int) ([]models.WorkflowInstance, error) {
	var rows []models.WorkflowInstance
	if len(statuses) == 0 {
		statuses = completedInstanceStatuses()
	}
	q := r.db.Preload("Workflow").Preload("Document").Preload("CurrentStep").
		Where("status IN ?", statuses)
	if initiatorID != nil {
		q = q.Where("initiator_id = ?", *initiatorID)
	}
	if limit > 0 {
		q = q.Limit(limit)
	}
	return rows, q.Order("COALESCE(finished_at, started_at) DESC").Find(&rows).Error
}

// ListCompletedInstancesForParticipant instances terminees initiees ou validees par l'utilisateur.
func (r *WorkflowRepository) ListCompletedInstancesForParticipant(userID uint, statuses []string, limit int) ([]models.WorkflowInstance, error) {
	var rows []models.WorkflowInstance
	if len(statuses) == 0 {
		statuses = completedInstanceStatuses()
	}
	q := r.db.Preload("Workflow").Preload("Document").Preload("CurrentStep").
		Where("status IN ?", statuses).
		Where(
			`initiator_id = ? OR EXISTS (
				SELECT 1 FROM workflow_approvals wa
				WHERE wa.instance_id = workflow_instances.id AND wa.approver_id = ?
			)`,
			userID, userID,
		)
	if limit > 0 {
		q = q.Limit(limit)
	}
	return rows, q.Order("COALESCE(finished_at, started_at) DESC").Find(&rows).Error
}

func completedInstanceStatuses() []string {
	return []string{
		models.WorkflowInstanceApproved,
		models.WorkflowInstanceRejected,
		models.WorkflowInstanceCancelled,
	}
}

func (r *WorkflowRepository) ListApprovals(instanceID uint) ([]models.WorkflowApproval, error) {
	var rows []models.WorkflowApproval
	err := r.db.Preload("Step").Preload("Approver").
		Where("instance_id = ?", instanceID).
		Order("decided_at ASC").
		Find(&rows).Error
	return rows, err
}

func (r *WorkflowRepository) ListInstancesByApprover(approverID uint, limit int) ([]models.WorkflowInstance, error) {
	var rows []models.WorkflowInstance
	idsSub := r.db.Model(&models.WorkflowInstance{}).
		Select("workflow_instances.id").
		Joins("JOIN workflow_approvals ON workflow_approvals.instance_id = workflow_instances.id").
		Where("workflow_approvals.approver_id = ?", approverID).
		Where("workflow_instances.status IN ?", completedInstanceStatuses()).
		Group("workflow_instances.id")

	q := r.db.Preload("Workflow").Preload("Document").
		Where("workflow_instances.id IN (?)", idsSub).
		Order("COALESCE(workflow_instances.finished_at, workflow_instances.started_at) DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	return rows, q.Find(&rows).Error
}

// ListPendingCandidates instances EN_COURS où l'utilisateur n'a pas encore validé l'étape courante.
func (r *WorkflowRepository) ListPendingCandidates(userID uint) ([]models.WorkflowInstance, error) {
	var rows []models.WorkflowInstance
	err := r.db.Preload("Workflow").Preload("Document").Preload("CurrentStep.Approvers").
		Where("workflow_instances.status = ?", models.WorkflowInstanceInProgress).
		Where("workflow_instances.current_step_id IS NOT NULL").
		Where(`NOT EXISTS (
			SELECT 1 FROM workflow_approvals wa
			WHERE wa.instance_id = workflow_instances.id
			AND wa.step_id = workflow_instances.current_step_id
			AND wa.approver_id = ?
		)`, userID).
		Order("workflow_instances.started_at ASC").
		Find(&rows).Error
	return rows, err
}

func (r *WorkflowRepository) CountInstancesByStatus(status string, initiatorID *uint) (int64, error) {
	var n int64
	q := r.db.Model(&models.WorkflowInstance{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if initiatorID != nil {
		q = q.Where("initiator_id = ?", *initiatorID)
	}
	return n, q.Count(&n).Error
}

func (r *WorkflowRepository) CountApprovers(stepID uint) (int64, error) {
	var n int64
	err := r.db.Model(&models.WorkflowApprover{}).Where("step_id = ?", stepID).Count(&n).Error
	return n, err
}

func (r *WorkflowRepository) UpdateDocumentStatus(docID uint, status string) error {
	return r.db.Model(&models.Document{}).Where("id = ?", docID).Update("status", status).Error
}

func (r *WorkflowRepository) UpdateDocumentVersionMeta(docID uint, current int, rejected *int, status string) error {
	updates := map[string]any{
		"current_version_number": current,
	}
	if status != "" {
		updates["status"] = status
	}
	if rejected != nil {
		updates["rejected_at_version"] = *rejected
	}
	return r.db.Model(&models.Document{}).Where("id = ?", docID).Updates(updates).Error
}

func (r *WorkflowRepository) LastRejectedInstance(docID uint) (*models.WorkflowInstance, error) {
	var inst models.WorkflowInstance
	err := r.db.Where("document_id = ? AND status = ?", docID, models.WorkflowInstanceRejected).
		Order("finished_at DESC").First(&inst).Error
	return &inst, err
}

func (r *WorkflowRepository) LastRejectApproval(instanceID uint) (*models.WorkflowApproval, error) {
	var a models.WorkflowApproval
	err := r.db.Where("instance_id = ? AND decision = ?", instanceID, models.ApprovalDecisionReject).
		Order("decided_at DESC").First(&a).Error
	return &a, err
}

func (r *WorkflowRepository) ArchiveDocument(docID uint) error {
	now := time.Now()
	return r.db.Model(&models.Document{}).Where("id = ?", docID).Updates(map[string]any{
		"status":      "ARCHIVE",
		"is_archived": true,
		"archived_at": &now,
	}).Error
}

// UserMayAccessDocumentForWorkflow true si user est approbateur de l'étape courante sur une instance en cours.
func (r *WorkflowRepository) UserMayAccessDocumentForWorkflow(docID, userID uint, role string) (bool, error) {
	var inst models.WorkflowInstance
	err := r.db.Preload("CurrentStep.Approvers").
		Where("document_id = ? AND status = ?", docID, models.WorkflowInstanceInProgress).
		First(&inst).Error
	if err == gorm.ErrRecordNotFound {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if inst.CurrentStep == nil {
		return false, nil
	}
	for _, a := range inst.CurrentStep.Approvers {
		if a.UserID != nil && *a.UserID == userID {
			return true, nil
		}
		if a.RoleName != "" && models.RoleMatchesStepApprover(a.RoleName, role) {
			return true, nil
		}
	}
	return false, nil
}
