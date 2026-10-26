package services

import (
	"errors"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"

	"gorm.io/gorm"
)

type WorkflowService struct {
	repo       *repository.WorkflowRepository
	docRepo    *repository.DocumentRepository
	collabRepo *repository.CollaborationRepository
	userRepo   repository.UserRepository
	notify     *NotificationService
	workflowRT *WorkflowRealtime
}

func NewWorkflowService(
	repo *repository.WorkflowRepository,
	docRepo *repository.DocumentRepository,
	collabRepo *repository.CollaborationRepository,
	userRepo repository.UserRepository,
	notify *NotificationService,
	workflowRT *WorkflowRealtime,
) *WorkflowService {
	return &WorkflowService{
		repo: repo, docRepo: docRepo, collabRepo: collabRepo, userRepo: userRepo, notify: notify, workflowRT: workflowRT,
	}
}

func (s *WorkflowService) pushWorkflowStats(userIDs ...uint) {
	if s.workflowRT != nil {
		s.workflowRT.PublishUsers(userIDs...)
	}
}

func (s *WorkflowService) ListWorkflows() ([]models.Workflow, error) {
	return s.repo.ListWorkflows()
}

func (s *WorkflowService) GetWorkflow(id uint) (*models.Workflow, error) {
	return s.repo.GetWorkflow(id)
}

func (s *WorkflowService) StartInstance(workflowID, documentID, initiatorID uint, comment string) (*models.WorkflowInstance, error) {
	doc, err := s.docRepo.FindByID(documentID)
	if err != nil {
		return nil, fmt.Errorf("document not found")
	}
	if doc.OwnerID != initiatorID {
		return nil, errors.New("only document owner can start workflow")
	}
	if doc.Status == models.DocumentStatusValidation {
		return nil, errors.New("document already in validation")
	}
	if doc.Status == models.DocumentStatusRejected {
		if !s.canRestartValidation(doc) {
			return nil, errors.New("importez une nouvelle version avant de relancer la validation")
		}
	}

	wf, err := s.repo.GetWorkflow(workflowID)
	if err != nil {
		return nil, err
	}
	if !wf.IsActive {
		return nil, errors.New("workflow is inactive")
	}
	first, err := s.repo.GetFirstStep(workflowID)
	if err != nil {
		return nil, fmt.Errorf("workflow has no steps")
	}

	inst := &models.WorkflowInstance{
		WorkflowID:    wf.ID,
		DocumentID:    documentID,
		InitiatorID:   initiatorID,
		CurrentStepID: &first.ID,
		Status:        models.WorkflowInstanceInProgress,
		Comment:       comment,
		StartedAt:     time.Now(),
	}
	if err := s.repo.CreateInstance(inst); err != nil {
		return nil, err
	}
	if err := s.repo.UpdateDocumentStatus(documentID, models.DocumentStatusValidation); err != nil {
		log.Printf("workflow: update document status validation: %v", err)
	}

	full, err := s.repo.GetInstance(inst.ID)
	if err != nil {
		return nil, err
	}
	s.notifyApproversForStep(full, first.ID, initiatorID)
	approverIDs := s.resolveApproverUserIDs(first.Approvers)
	s.pushWorkflowStats(append(approverIDs, initiatorID)...)
	return full, nil
}

func (s *WorkflowService) StartValidation(documentID, initiatorID uint, comment string) (*models.WorkflowInstance, error) {
	wf, err := s.repo.FindWorkflowByName(models.WorkflowNameValidation)
	if err != nil {
		return nil, fmt.Errorf("validation workflow not seeded")
	}
	return s.StartInstance(wf.ID, documentID, initiatorID, comment)
}

// RestartValidation relance validation apres correction (nouvelle version > version rejetee).
func (s *WorkflowService) RestartValidation(documentID, initiatorID uint, comment string) (*models.WorkflowInstance, error) {
	doc, err := s.docRepo.FindByID(documentID)
	if err != nil {
		return nil, fmt.Errorf("document not found")
	}
	if doc.OwnerID != initiatorID {
		return nil, errors.New("only document owner can restart validation")
	}
	if doc.Status != models.DocumentStatusDraft && doc.Status != models.DocumentStatusRejected {
		return nil, errors.New("document cannot restart validation in current status")
	}
	if !s.canRestartValidation(doc) {
		return nil, errors.New("importez une nouvelle version avant de relancer la validation")
	}
	if doc.Status == models.DocumentStatusRejected {
		if err := s.repo.UpdateDocumentStatus(documentID, models.DocumentStatusDraft); err != nil {
			log.Printf("workflow: reset document status draft: %v", err)
		}
	}
	return s.StartValidation(documentID, initiatorID, comment)
}

func (s *WorkflowService) canRestartValidation(doc *models.Document) bool {
	cur := doc.CurrentVersionNumber
	if cur <= 0 {
		cur = s.resolveCurrentVersionNumber(doc.ID)
	}
	if doc.RejectedAtVersion == nil {
		return doc.Status == models.DocumentStatusDraft
	}
	return cur > *doc.RejectedAtVersion
}

func (s *WorkflowService) resolveCurrentVersionNumber(docID uint) int {
	if s.collabRepo == nil {
		return 1
	}
	max, err := s.collabRepo.MaxVersionNumber(docID)
	if err != nil || max <= 0 {
		return 1
	}
	return max
}

// ValidationContext infos rejet + possibilite de relancer.
type ValidationContext struct {
	Status                 string  `json:"status"`
	CurrentVersionNumber   int     `json:"current_version_number"`
	RejectedAtVersion      *int    `json:"rejected_at_version,omitempty"`
	CanRestartValidation   bool    `json:"can_restart_validation"`
	RejectionComment       string  `json:"rejection_comment,omitempty"`
	RejectionDate          *time.Time `json:"rejection_date,omitempty"`
	RejectedByEmail        string  `json:"rejected_by_email,omitempty"`
}

func (s *WorkflowService) GetValidationContext(docID uint) (*ValidationContext, error) {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, err
	}
	cur := doc.CurrentVersionNumber
	if cur <= 0 {
		cur = s.resolveCurrentVersionNumber(docID)
	}
	ctx := &ValidationContext{
		Status:               doc.Status,
		CurrentVersionNumber: cur,
		RejectedAtVersion:    doc.RejectedAtVersion,
		CanRestartValidation: s.canRestartValidation(doc),
	}
	if doc.Status != models.DocumentStatusRejected && doc.RejectedAtVersion == nil {
		return ctx, nil
	}
	inst, err := s.repo.LastRejectedInstance(docID)
	if err != nil {
		return ctx, nil
	}
	if appr, err := s.repo.LastRejectApproval(inst.ID); err == nil {
		ctx.RejectionComment = appr.Comment
		ctx.RejectionDate = &appr.DecidedAt
		if u, err := s.userRepo.GetByID(appr.ApproverID); err == nil {
			ctx.RejectedByEmail = u.Email
		}
	}
	return ctx, nil
}

func (s *WorkflowService) PendingApprovals(userID uint, role string) ([]models.WorkflowInstance, error) {
	rows, err := s.repo.ListPendingCandidates(userID)
	if err != nil {
		return nil, err
	}
	out := make([]models.WorkflowInstance, 0, len(rows))
	for i := range rows {
		inst := rows[i]
		if inst.CurrentStepID == nil {
			continue
		}
		if inst.CurrentStep != nil && canApproveFromStep(inst.CurrentStep, userID, role) {
			out = append(out, inst)
		}
	}
	return out, nil
}

func (s *WorkflowService) PendingApprovalsCount(userID uint, role string) (int64, error) {
	rows, err := s.PendingApprovals(userID, role)
	if err != nil {
		return 0, err
	}
	return int64(len(rows)), nil
}

func (s *WorkflowService) MyInProgress(initiatorID uint) ([]models.WorkflowInstance, error) {
	return s.repo.ListInstancesByStatus(models.WorkflowInstanceInProgress, &initiatorID, 100)
}

func (s *WorkflowService) MyInProgressCount(initiatorID uint) (int64, error) {
	return s.repo.CountInstancesByStatus(models.WorkflowInstanceInProgress, &initiatorID)
}

func (s *WorkflowService) Completed(userID uint, orgWide bool, statusFilter string) ([]models.WorkflowInstance, error) {
	statuses := []string{
		models.WorkflowInstanceApproved,
		models.WorkflowInstanceRejected,
		models.WorkflowInstanceCancelled,
	}
	if statusFilter != "" {
		statuses = []string{statusFilter}
	}
	if orgWide {
		return s.repo.ListCompletedInstances(nil, statuses, 100)
	}
	return s.repo.ListCompletedInstancesForParticipant(userID, statuses, 100)
}

func (s *WorkflowService) MyDecisions(approverID uint) ([]models.WorkflowInstance, error) {
	return s.repo.ListInstancesByApprover(approverID, 100)
}

func (s *WorkflowService) InitiatorEmail(userID uint) (string, error) {
	if s.userRepo == nil || userID == 0 {
		return "", errors.New("no user")
	}
	u, err := s.userRepo.GetByID(userID)
	if err != nil || u == nil {
		return "", err
	}
	return u.Email, nil
}

// InstanceStepsProgress construit le parcours des etapes avec statut derive des decisions.
func (s *WorkflowService) InstanceStepsProgress(
	inst *models.WorkflowInstance,
	approvals []models.WorkflowApproval,
) []map[string]any {
	if inst == nil {
		return nil
	}
	wf, err := s.repo.GetWorkflow(inst.WorkflowID)
	if err != nil || wf == nil || len(wf.Steps) == 0 {
		return nil
	}

	byStep := map[uint][]models.WorkflowApproval{}
	for _, a := range approvals {
		byStep[a.StepID] = append(byStep[a.StepID], a)
	}

	out := make([]map[string]any, 0, len(wf.Steps))
	for _, step := range wf.Steps {
		decisions := byStep[step.ID]
		statut := "EN_ATTENTE"
		var lastAt *time.Time
		reject := false
		approveCount := 0
		for i := range decisions {
			d := decisions[i]
			if d.Decision == models.ApprovalDecisionReject {
				reject = true
			}
			if d.Decision == models.ApprovalDecisionApprove {
				approveCount++
			}
			t := d.DecidedAt
			if lastAt == nil || t.After(*lastAt) {
				lastAt = &t
			}
		}
		isCurrent := inst.CurrentStepID != nil && *inst.CurrentStepID == step.ID &&
			inst.Status == models.WorkflowInstanceInProgress

		switch {
		case reject:
			statut = models.ApprovalDecisionReject
		case isCurrent:
			statut = "EN_COURS"
		case approveCount > 0:
			statut = models.ApprovalDecisionApprove
		case inst.Status == models.WorkflowInstanceApproved && approveCount == 0 && !isCurrent:
			// Cloturee sans decision sur cette etape (bug historique ou saut).
			statut = "NON_PARCOURUE"
		case inst.Status == models.WorkflowInstanceRejected && approveCount == 0 && !isCurrent:
			statut = "NON_PARCOURUE"
		case inst.Status == models.WorkflowInstanceCancelled:
			statut = "ANNULE"
		}

		row := map[string]any{
			"id":            step.ID,
			"nom":           step.Name,
			"ordre":         step.StepOrder,
			"approval_type": step.ApprovalType,
			"statut":        statut,
			"decisions":     len(decisions),
		}
		if lastAt != nil {
			row["date"] = *lastAt
		}
		out = append(out, row)
	}
	return out
}

func (s *WorkflowService) GetInstanceDetail(id, userID uint, role string) (*models.WorkflowInstance, []models.WorkflowApproval, error) {
	inst, err := s.repo.GetInstance(id)
	if err != nil {
		return nil, nil, err
	}
	if !models.RoleIsAdmin(role) && !models.RoleCanViewOrgWorkflows(role) && inst.InitiatorID != userID {
		approvals, _ := s.repo.ListApprovals(id)
		participant := false
		for _, a := range approvals {
			if a.ApproverID == userID {
				participant = true
				break
			}
		}
		if !participant {
			doc, derr := s.docRepo.FindByID(inst.DocumentID)
			if derr != nil || doc.OwnerID != userID {
				return nil, nil, errors.New("forbidden")
			}
		}
	}
	approvals, err := s.repo.ListApprovals(id)
	if err != nil {
		return nil, nil, err
	}
	return inst, approvals, nil
}

func (s *WorkflowService) Approve(instanceID, userID uint, role, comment string) error {
	return s.decide(instanceID, userID, role, comment, models.ApprovalDecisionApprove)
}

func (s *WorkflowService) Reject(instanceID, userID uint, role, comment string) error {
	return s.decide(instanceID, userID, role, comment, models.ApprovalDecisionReject)
}

func (s *WorkflowService) decide(instanceID, userID uint, role, comment, decision string) error {
	inst, err := s.repo.GetInstance(instanceID)
	if err != nil {
		return err
	}
	if inst.Status != models.WorkflowInstanceInProgress {
		return errors.New("instance not in progress")
	}
	if inst.CurrentStep == nil {
		return errors.New("no current step")
	}
	step := inst.CurrentStep
	stepID := step.ID

	if !canApproveFromStep(step, userID, role) {
		return errors.New("not an approver for this step")
	}

	complete, err := s.isStepComplete(inst, stepID)
	if err != nil {
		return err
	}
	if complete {
		return s.advance(inst)
	}

	if inst.InitiatorID == userID && !models.RoleIsAdmin(role) {
		return errors.New("cannot approve own workflow request")
	}

	already, _ := s.repo.HasUserApproved(instanceID, stepID, userID)
	if already {
		return errors.New("already decided on this step")
	}

	if err := s.repo.CreateApproval(&models.WorkflowApproval{
		InstanceID: instanceID,
		StepID:     stepID,
		ApproverID: userID,
		Decision:   decision,
		Comment:    comment,
		DecidedAt:  time.Now(),
	}); err != nil {
		return err
	}

	if decision == models.ApprovalDecisionReject {
		return s.finishRejected(inst, userID, comment)
	}

	complete, err = s.isStepComplete(inst, stepID)
	if err != nil {
		return err
	}
	if !complete {
		s.pushWorkflowStats(userID, inst.InitiatorID)
		return nil
	}
	return s.advance(inst)
}

func (s *WorkflowService) canApprove(stepID, userID uint, role string) bool {
	step, err := s.repo.GetStep(stepID)
	if err != nil {
		return false
	}
	return canApproveFromStep(step, userID, role)
}

func canApproveFromStep(step *models.WorkflowStep, userID uint, role string) bool {
	if step == nil {
		return false
	}
	for _, a := range step.Approvers {
		if a.UserID != nil && *a.UserID == userID {
			return true
		}
		if a.RoleName != "" && models.RoleMatchesStepApprover(a.RoleName, role) {
			return true
		}
	}
	return false
}

func canApproveWorkflowStep(repo *repository.WorkflowRepository, stepID, userID uint, role string) bool {
	step, err := repo.GetStep(stepID)
	if err != nil {
		return false
	}
	return canApproveFromStep(step, userID, role)
}

func stepCompleteRule(approvalType string, approved, totalApprovers int64) bool {
	switch approvalType {
	case models.StepApprovalMultiple, models.StepApprovalParallel:
		if totalApprovers <= 0 {
			return approved >= 1
		}
		return approved >= totalApprovers
	default:
		return approved >= 1
	}
}

func (s *WorkflowService) isStepComplete(inst *models.WorkflowInstance, stepID uint) (bool, error) {
	step, err := s.repo.GetStep(stepID)
	if err != nil {
		return false, err
	}
	approved, err := s.repo.CountApprovals(inst.ID, stepID, models.ApprovalDecisionApprove)
	if err != nil {
		return false, err
	}
	total := int64(0)
	if step.ApprovalType == models.StepApprovalMultiple ||
		step.ApprovalType == models.StepApprovalParallel {
		total, err = s.repo.CountApprovers(stepID)
		if err != nil {
			return false, err
		}
	}
	// SIMPLE : complète seulement après ≥1 approbation (évite cloture sans historique).
	return stepCompleteRule(step.ApprovalType, approved, total), nil
}

func (s *WorkflowService) advance(inst *models.WorkflowInstance) error {
	step, err := s.repo.GetStep(*inst.CurrentStepID)
	if err != nil {
		return err
	}
	next, err := s.repo.GetNextStep(inst.WorkflowID, step.StepOrder)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return s.finishApproved(inst)
		}
		return err
	}
	if err := s.repo.UpdateInstanceCurrentStep(inst.ID, &next.ID); err != nil {
		return err
	}
	full, err := s.repo.GetInstance(inst.ID)
	if err == nil && full.CurrentStepID != nil {
		stepName := ""
		if full.CurrentStep != nil {
			stepName = full.CurrentStep.Name
		}
		title := s.docTitle(full.DocumentID)
		s.notify.Send(
			full.InitiatorID,
			NotifTypeWorkflowAdvanced,
			"Étape suivante",
			fmt.Sprintf("« %s » : étape « %s » en cours de validation.", title, stepName),
			"/workflows/en-cours",
		)
		s.notifyApproversForStep(full, *full.CurrentStepID, full.InitiatorID)
		if full.CurrentStep != nil {
			s.pushWorkflowStats(append(s.resolveApproverUserIDs(full.CurrentStep.Approvers), full.InitiatorID)...)
		} else {
			s.pushWorkflowStats(full.InitiatorID)
		}
	}
	return nil
}

func (s *WorkflowService) finishApproved(inst *models.WorkflowInstance) error {
	now := time.Now()
	if err := s.repo.UpdateInstanceFinished(inst.ID, models.WorkflowInstanceApproved, now); err != nil {
		return err
	}
	if err := s.repo.UpdateDocumentStatus(inst.DocumentID, models.DocumentStatusApproved); err != nil {
		return err
	}
	wf, _ := s.repo.GetWorkflow(inst.WorkflowID)
	if wf != nil && wf.Name == models.WorkflowNameArchive {
		if err := s.repo.ArchiveDocument(inst.DocumentID); err != nil {
			return err
		}
	}
	title := s.docTitle(inst.DocumentID)
	wfName := ""
	if wf != nil {
		wfName = wf.Name
	}
	msg := fmt.Sprintf("Le document « %s » a été approuvé", title)
	if wfName != "" {
		msg = fmt.Sprintf("%s (%s).", msg, wfName)
	} else {
		msg += "."
	}
	s.notify.Send(
		inst.InitiatorID,
		NotifTypeWorkflowApproved,
		"Validation approuvée",
		msg,
		fmt.Sprintf("/documents/%d", inst.DocumentID),
	)
	s.pushWorkflowStats(inst.InitiatorID)
	return nil
}

func (s *WorkflowService) finishRejected(inst *models.WorkflowInstance, rejectorID uint, comment string) error {
	now := time.Now()
	if err := s.repo.UpdateInstanceFinished(inst.ID, models.WorkflowInstanceRejected, now); err != nil {
		return err
	}
	rejectedVer := s.resolveCurrentVersionNumber(inst.DocumentID)
	if err := s.repo.UpdateDocumentVersionMeta(
		inst.DocumentID,
		rejectedVer,
		&rejectedVer,
		models.DocumentStatusRejected,
	); err != nil {
		return err
	}
	title := s.docTitle(inst.DocumentID)
	msg := fmt.Sprintf("Le document « %s » a été rejeté.", title)
	if comment != "" {
		msg += " Motif : " + comment
	}
	s.notify.Send(
		inst.InitiatorID,
		NotifTypeWorkflowRejected,
		"Validation rejetée",
		msg,
		fmt.Sprintf("/documents/%d", inst.DocumentID),
	)
	s.pushWorkflowStats(inst.InitiatorID, rejectorID)
	return nil
}

func (s *WorkflowService) Cancel(instanceID, userID uint, isAdmin bool) error {
	inst, err := s.repo.GetInstance(instanceID)
	if err != nil {
		return err
	}
	if inst.InitiatorID != userID && !isAdmin {
		return errors.New("forbidden")
	}
	if inst.Status != models.WorkflowInstanceInProgress {
		return errors.New("cannot cancel")
	}
	if inst.CurrentStepID != nil {
		s.notifyApproversCancelled(inst, *inst.CurrentStepID, userID)
	}
	now := time.Now()
	if err := s.repo.UpdateInstanceCancelled(inst.ID, now); err != nil {
		return err
	}
	if err := s.repo.UpdateDocumentStatus(inst.DocumentID, models.DocumentStatusDraft); err != nil {
		return err
	}
	title := s.docTitle(inst.DocumentID)
	if inst.InitiatorID != userID {
		s.notify.Send(
			inst.InitiatorID,
			NotifTypeWorkflowCancelled,
			"Workflow annulé",
			fmt.Sprintf("La validation de « %s » a été annulée par un administrateur.", title),
			"/workflows/en-cours",
		)
	}
	s.pushWorkflowStats(inst.InitiatorID, userID)
	return nil
}

func (s *WorkflowService) GetInstance(id uint) (*models.WorkflowInstance, error) {
	return s.repo.GetInstance(id)
}

func (s *WorkflowService) docTitle(docID uint) string {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil || doc.Title == "" {
		return fmt.Sprintf("document #%d", docID)
	}
	return doc.Title
}

func (s *WorkflowService) resolveApproverUserIDs(approvers []models.WorkflowApprover) []uint {
	seen := make(map[uint]struct{})
	var ids []uint
	for _, a := range approvers {
		if a.UserID != nil && *a.UserID > 0 {
			if _, ok := seen[*a.UserID]; !ok {
				seen[*a.UserID] = struct{}{}
				ids = append(ids, *a.UserID)
			}
		}
		if a.RoleName != "" {
			users, err := s.userRepo.ListByRole(a.RoleName)
			if err != nil {
				continue
			}
			for _, u := range users {
				if _, ok := seen[u.ID]; !ok {
					seen[u.ID] = struct{}{}
					ids = append(ids, u.ID)
				}
			}
		}
	}
	return ids
}

func (s *WorkflowService) notifyApproversForStep(inst *models.WorkflowInstance, stepID uint, skipUserID uint) {
	if s.notify == nil {
		return
	}
	step, err := s.repo.GetStep(stepID)
	if err != nil {
		return
	}
	ids := s.resolveApproverUserIDs(step.Approvers)
	filtered := make([]uint, 0, len(ids))
	for _, id := range ids {
		if id != skipUserID {
			filtered = append(filtered, id)
		}
	}
	if len(filtered) == 0 {
		return
	}
	title := s.docTitle(inst.DocumentID)
	wfName := ""
	if inst.Workflow != nil {
		wfName = inst.Workflow.Name
	}
	stepName := step.Name
	msg := fmt.Sprintf("« %s » attend votre validation", title)
	if stepName != "" {
		msg = fmt.Sprintf("« %s » — étape « %s »", title, stepName)
	}
	if wfName != "" {
		msg += fmt.Sprintf(" (%s)", wfName)
	}
	s.notify.SendMany(
		filtered,
		NotifTypeWorkflowPending,
		"Approbation requise",
		msg,
		"/workflows/approbations",
	)
}

func (s *WorkflowService) notifyApproversCancelled(inst *models.WorkflowInstance, stepID uint, cancelledBy uint) {
	if s.notify == nil {
		return
	}
	step, err := s.repo.GetStep(stepID)
	if err != nil {
		return
	}
	ids := s.resolveApproverUserIDs(step.Approvers)
	filtered := make([]uint, 0, len(ids))
	for _, id := range ids {
		if id != cancelledBy && id != inst.InitiatorID {
			filtered = append(filtered, id)
		}
	}
	if len(filtered) == 0 {
		return
	}
	title := s.docTitle(inst.DocumentID)
	s.notify.SendMany(
		filtered,
		NotifTypeWorkflowCancelled,
		"Workflow annulé",
		fmt.Sprintf("La demande de validation pour « %s » a été annulée.", title),
		"/workflows/approbations",
	)
}

func validateApprovalType(t string) error {
	if t == "" {
		return nil
	}
	switch t {
	case models.StepApprovalSimple, models.StepApprovalMultiple, models.StepApprovalParallel:
		return nil
	default:
		return fmt.Errorf("invalid approval_type: %s", t)
	}
}

func (s *WorkflowService) validateAndBuildSteps(steps []dto.AdminWorkflowStepInput) ([]models.WorkflowStep, error) {
	if len(steps) == 0 {
		return nil, errors.New("at least one step required")
	}
	orderSeen := map[int]struct{}{}
	for _, st := range steps {
		if strings.TrimSpace(st.Name) == "" {
			return nil, errors.New("step name required")
		}
		if st.StepOrder < 1 {
			return nil, errors.New("step_order must be >= 1")
		}
		if _, dup := orderSeen[st.StepOrder]; dup {
			return nil, errors.New("duplicate step_order")
		}
		orderSeen[st.StepOrder] = struct{}{}
		if err := validateApprovalType(st.ApprovalType); err != nil {
			return nil, err
		}
		if len(st.Approvers) == 0 {
			return nil, errors.New("each step needs at least one approver")
		}
		for _, a := range st.Approvers {
			if (a.UserID == nil || *a.UserID == 0) && a.RoleName == "" {
				return nil, errors.New("approver needs user_id or role_name")
			}
			if a.RoleName != "" && !models.IsValidRole(a.RoleName) {
				return nil, fmt.Errorf("invalid role_name: %s", a.RoleName)
			}
			if a.UserID != nil && *a.UserID > 0 {
				if _, err := s.userRepo.GetByID(*a.UserID); err != nil {
					return nil, fmt.Errorf("user_id %d not found", *a.UserID)
				}
			}
		}
	}
	sorted := append([]dto.AdminWorkflowStepInput(nil), steps...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].StepOrder < sorted[j].StepOrder })
	out := make([]models.WorkflowStep, 0, len(sorted))
	for _, st := range sorted {
		at := st.ApprovalType
		if at == "" {
			at = models.StepApprovalSimple
		}
		ws := models.WorkflowStep{
			Name:         st.Name,
			Description:  st.Description,
			StepOrder:    st.StepOrder,
			ApprovalType: at,
		}
		for _, a := range st.Approvers {
			wa := models.WorkflowApprover{RoleName: strings.TrimSpace(a.RoleName)}
			if a.UserID != nil && *a.UserID > 0 {
				uid := *a.UserID
				wa.UserID = &uid
			}
			ws.Approvers = append(ws.Approvers, wa)
		}
		out = append(out, ws)
	}
	return out, nil
}

func (s *WorkflowService) AdminListAllWorkflows() ([]models.Workflow, error) {
	return s.repo.ListAllWorkflows()
}

func (s *WorkflowService) AdminCountInstances(workflowID uint) (int64, error) {
	return s.repo.CountInstancesForWorkflow(workflowID)
}

func (s *WorkflowService) AdminCreateWorkflow(initiatorUserID uint, req dto.AdminCreateWorkflowRequest) (*models.Workflow, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("name required")
	}
	if models.WorkflowNameIsProtected(name) {
		return nil, errors.New("reserved workflow name")
	}
	taken, err := s.repo.WorkflowNameTaken(name, 0)
	if err != nil {
		return nil, err
	}
	if taken {
		return nil, errors.New("workflow name already exists")
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	steps, err := s.validateAndBuildSteps(req.Steps)
	if err != nil {
		return nil, err
	}
	wf := &models.Workflow{
		Name:        name,
		Description: req.Description,
		IsActive:    active,
	}
	if initiatorUserID > 0 {
		wf.CreatedByID = &initiatorUserID
	}
	wf.Steps = steps
	if err := s.repo.CreateWorkflow(wf); err != nil {
		return nil, err
	}
	return s.repo.GetWorkflow(wf.ID)
}

func (s *WorkflowService) AdminUpdateWorkflow(workflowID uint, req dto.AdminUpdateWorkflowRequest) (*models.Workflow, error) {
	wf, err := s.repo.GetWorkflow(workflowID)
	if err != nil {
		return nil, err
	}
	protected := models.WorkflowNameIsProtected(wf.Name)
	instanceCount, err := s.repo.CountInstancesForWorkflow(workflowID)
	if err != nil {
		return nil, err
	}

	name := wf.Name
	desc := wf.Description
	active := wf.IsActive

	if req.Name != nil {
		newName := strings.TrimSpace(*req.Name)
		if newName == "" {
			return nil, errors.New("name empty")
		}
		if protected && newName != wf.Name {
			return nil, errors.New("cannot rename protected workflow")
		}
		if !protected && newName != wf.Name {
			if models.WorkflowNameIsProtected(newName) {
				return nil, errors.New("reserved workflow name")
			}
			taken, err := s.repo.WorkflowNameTaken(newName, workflowID)
			if err != nil {
				return nil, err
			}
			if taken {
				return nil, errors.New("workflow name already exists")
			}
		}
		name = newName
	}

	if req.Description != nil {
		desc = *req.Description
	}
	if req.IsActive != nil {
		if protected && !*req.IsActive {
			return nil, errors.New("cannot deactivate protected workflow")
		}
		active = *req.IsActive
	}

	if err := s.repo.UpdateWorkflowFields(workflowID, name, desc, active); err != nil {
		return nil, err
	}

	if req.Steps != nil {
		if protected {
			return nil, errors.New("cannot replace steps on protected workflow")
		}
		if instanceCount > 0 {
			return nil, errors.New("cannot replace steps while instances exist")
		}
		steps, err := s.validateAndBuildSteps(*req.Steps)
		if err != nil {
			return nil, err
		}
		if err := s.repo.ReplaceWorkflowSteps(workflowID, steps); err != nil {
			return nil, err
		}
	}
	return s.repo.GetWorkflow(workflowID)
}

func (s *WorkflowService) AdminDeleteWorkflow(workflowID uint) error {
	wf, err := s.repo.GetWorkflow(workflowID)
	if err != nil {
		return err
	}
	if models.WorkflowNameIsProtected(wf.Name) {
		return errors.New("cannot delete protected workflow")
	}
	n, err := s.repo.CountInstancesForWorkflow(workflowID)
	if err != nil {
		return err
	}
	if n > 0 {
		return errors.New("cannot delete workflow with instances")
	}
	return s.repo.DeleteWorkflow(workflowID)
}

// RepairStuckInstances répare les instances dont l'étape SIMPLE est déjà approuvée mais non avancée (bug GORM).
func (s *WorkflowService) RepairStuckInstances() int {
	rows, err := s.repo.ListInstancesByStatus(models.WorkflowInstanceInProgress, nil, 500)
	if err != nil {
		return 0
	}
	fixed := 0
	for i := range rows {
		inst := &rows[i]
		if inst.CurrentStepID == nil {
			continue
		}
		approved, _ := s.repo.CountApprovals(inst.ID, *inst.CurrentStepID, models.ApprovalDecisionApprove)
		if approved == 0 {
			continue
		}
		complete, err := s.isStepComplete(inst, *inst.CurrentStepID)
		if err != nil || !complete {
			continue
		}
		if err := s.advance(inst); err == nil {
			fixed++
		}
	}
	return fixed
}

// NotifyStalePendingApprovals rappel si validation en attente > 48h (sans approbation sur l'étape courante).
func (s *WorkflowService) NotifyStalePendingApprovals() int {
	rows, err := s.repo.ListInstancesByStatus(models.WorkflowInstanceInProgress, nil, 500)
	if err != nil {
		return 0
	}
	cutoff := time.Now().Add(-48 * time.Hour)
	sent := 0
	for i := range rows {
		inst := rows[i]
		if inst.StartedAt.After(cutoff) || inst.CurrentStepID == nil {
			continue
		}
		approved, _ := s.repo.CountApprovals(inst.ID, *inst.CurrentStepID, models.ApprovalDecisionApprove)
		if approved > 0 {
			continue
		}
		step, err := s.repo.GetStep(*inst.CurrentStepID)
		if err != nil {
			continue
		}
		title := s.docTitle(inst.DocumentID)
		ids := s.resolveApproverUserIDs(step.Approvers)
		for _, uid := range ids {
			if uid == 0 || uid == inst.InitiatorID {
				continue
			}
			_ = s.notify.Send(
				uid,
				NotifTypeWorkflowPending,
				"Rappel — validation en attente",
				fmt.Sprintf("« %s » attend une validation depuis plus de 48 h.", title),
				"/workflows/approbations",
			)
			sent++
		}
	}
	return sent
}
