package handlers

import (
	"net/http"
	"strconv"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type WorkflowHandler struct {
	workflowService *services.WorkflowService
	audit           *services.AuditService
}

func NewWorkflowHandler(workflowService *services.WorkflowService, audit *services.AuditService) *WorkflowHandler {
	return &WorkflowHandler{workflowService: workflowService, audit: audit}
}

func instanceView(inst *models.WorkflowInstance) map[string]any {
	v := map[string]any{
		"id":              inst.ID,
		"workflow_id":     inst.WorkflowID,
		"document_id":     inst.DocumentID,
		"initiator_id":    inst.InitiatorID,
		"current_step_id": inst.CurrentStepID,
		"statut":          inst.Status,
		"status":          inst.Status,
		"commentaire":     inst.Comment,
		"date_debut":      inst.StartedAt,
		"date_fin":        inst.FinishedAt,
	}
	if inst.Workflow != nil {
		v["workflow_nom"] = inst.Workflow.Name
	}
	if inst.Document != nil {
		v["document_titre"] = inst.Document.Title
	}
	if inst.CurrentStep != nil {
		v["etape_courante_nom"] = inst.CurrentStep.Name
		if inst.Status == models.WorkflowInstanceInProgress {
			v["en_attente_label"] = waitingLabelForStep(inst.CurrentStep)
		}
	}
	return v
}

func approvalView(a *models.WorkflowApproval) map[string]any {
	v := map[string]any{
		"id":        a.ID,
		"decision":  a.Decision,
		"commentaire": a.Comment,
		"date":      a.DecidedAt,
		"step_id":   a.StepID,
	}
	if a.Step != nil {
		v["etape_nom"] = a.Step.Name
	}
	if a.Approver != nil {
		v["approver_email"] = a.Approver.Email
	}
	return v
}

// ListWorkflows GET /api/workflows
func (h *WorkflowHandler) ListWorkflows(c echo.Context) error {
	rows, err := h.workflowService.ListWorkflows()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}

// Start POST /api/workflows/:id/start
func (h *WorkflowHandler) Start(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	wfID, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var body struct {
		DocumentID  uint   `json:"document_id" validate:"required,gt=0"`
		Commentaire string `json:"commentaire"`
	}
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "document_id required"})
	}
	inst, err := h.workflowService.StartInstance(wfID, body.DocumentID, userID, body.Commentaire)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "workflow.start", "document", strconv.FormatUint(uint64(body.DocumentID), 10)))
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "data": instanceView(inst)})
}

// StartValidation POST /api/workflows/validation/start
func (h *WorkflowHandler) StartValidation(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	var body struct {
		DocumentID  uint   `json:"document_id" validate:"required,gt=0"`
		Commentaire string `json:"commentaire"`
	}
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "document_id required"})
	}
	inst, err := h.workflowService.StartValidation(body.DocumentID, userID, body.Commentaire)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "workflow.validation_start", "document", strconv.FormatUint(uint64(body.DocumentID), 10)))
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "data": instanceView(inst)})
}

// RestartValidation POST /api/workflows/validation/restart
func (h *WorkflowHandler) RestartValidation(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	var body struct {
		DocumentID  uint   `json:"document_id" validate:"required,gt=0"`
		Commentaire string `json:"commentaire"`
	}
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "document_id required"})
	}
	inst, err := h.workflowService.RestartValidation(body.DocumentID, userID, body.Commentaire)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "workflow.validation_restart", "document", strconv.FormatUint(uint64(body.DocumentID), 10)))
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "data": instanceView(inst)})
}

// ValidationContext GET /api/documents/:id/validation-context
func (h *WorkflowHandler) ValidationContext(c echo.Context) error {
	if _, err := userIDFromContext(c); err != nil {
		return err
	}
	docID, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	ctx, err := h.workflowService.GetValidationContext(docID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": ctx})
}

// Pending GET /api/workflows/instances/pending
func (h *WorkflowHandler) Pending(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	role, _ := c.Get("role").(string)
	rows, err := h.workflowService.PendingApprovals(userID, role)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	out := make([]map[string]any, 0, len(rows))
	for i := range rows {
		out = append(out, instanceView(&rows[i]))
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": out})
}

// InProgress GET /api/workflows/instances/in-progress
func (h *WorkflowHandler) InProgress(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	rows, err := h.workflowService.MyInProgress(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	out := make([]map[string]any, 0, len(rows))
	for i := range rows {
		out = append(out, instanceView(&rows[i]))
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": out})
}

// Completed GET /api/workflows/instances/completed
func (h *WorkflowHandler) Completed(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	orgWide := hasOrgWorkflowView(c) && c.QueryParam("all") == "true"
	statusFilter := c.QueryParam("status")
	rows, err := h.workflowService.Completed(userID, orgWide, statusFilter)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	out := make([]map[string]any, 0, len(rows))
	for i := range rows {
		out = append(out, instanceView(&rows[i]))
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": out})
}

// MyDecisions GET /api/workflows/instances/my-decisions
func (h *WorkflowHandler) MyDecisions(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	rows, err := h.workflowService.MyDecisions(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	out := make([]map[string]any, 0, len(rows))
	for i := range rows {
		out = append(out, instanceView(&rows[i]))
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": out})
}

// GetInstance GET /api/workflows/instances/:id
func (h *WorkflowHandler) GetInstance(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	inst, approvals, err := h.workflowService.GetInstanceDetail(id, userID, roleFromContext(c))
	if err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": err.Error()})
	}
	apprOut := make([]map[string]any, 0, len(approvals))
	for i := range approvals {
		apprOut = append(apprOut, approvalView(&approvals[i]))
	}
	v := instanceView(inst)
	v["approvals"] = apprOut
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": v})
}

// Approve POST /api/workflows/instances/:id/approve
func (h *WorkflowHandler) Approve(c echo.Context) error {
	return h.decide(c, true)
}

// Reject POST /api/workflows/instances/:id/reject
func (h *WorkflowHandler) Reject(c echo.Context) error {
	return h.decide(c, false)
}

func (h *WorkflowHandler) decide(c echo.Context, approve bool) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	role, _ := c.Get("role").(string)
	var body struct {
		Commentaire string `json:"commentaire"`
	}
	if err := bindJSONOptionalStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}

	var svcErr error
	action := "workflow.approve"
	if approve {
		svcErr = h.workflowService.Approve(id, userID, role, body.Commentaire)
	} else {
		action = "workflow.reject"
		svcErr = h.workflowService.Reject(id, userID, role, body.Commentaire)
	}
	if svcErr != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": svcErr.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, action, "workflow_instance", strconv.FormatUint(uint64(id), 10)))
	inst, _ := h.workflowService.GetInstance(id)
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": instanceView(inst)})
}

// Cancel POST /api/workflows/instances/:id/cancel
func (h *WorkflowHandler) Cancel(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if err := h.workflowService.Cancel(id, userID, isAdminFromContext(c)); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "workflow.cancel", "workflow_instance", strconv.FormatUint(uint64(id), 10)))
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}
