package handlers

import (
	"net/http"

	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type AdminWorkflowHandler struct {
	svc *services.WorkflowService
}

func NewAdminWorkflowHandler(svc *services.WorkflowService) *AdminWorkflowHandler {
	return &AdminWorkflowHandler{svc: svc}
}

func (h *AdminWorkflowHandler) List(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	rows, err := h.svc.AdminListAllWorkflows()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	type row struct {
		Workflow       models.Workflow `json:"workflow"`
		Protected      bool            `json:"protected"`
		InstanceCount  int64           `json:"instance_count"`
	}
	out := make([]row, 0, len(rows))
	for i := range rows {
		w := rows[i]
		cnt, _ := h.svc.AdminCountInstances(w.ID)
		out = append(out, row{
			Workflow:      w,
			Protected:     models.WorkflowNameIsProtected(w.Name),
			InstanceCount: cnt,
		})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": out})
}

func (h *AdminWorkflowHandler) Get(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	wf, err := h.svc.GetWorkflow(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]any{"success": false, "error": "workflow not found"})
	}
	cnt, _ := h.svc.AdminCountInstances(wf.ID)
	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"workflow":         wf,
			"protected":        models.WorkflowNameIsProtected(wf.Name),
			"instance_count":   cnt,
		},
	})
}

func (h *AdminWorkflowHandler) Create(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	var body dto.AdminCreateWorkflowRequest
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	wf, err := h.svc.AdminCreateWorkflow(userID, body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "data": wf})
}

func (h *AdminWorkflowHandler) Put(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var body dto.AdminUpdateWorkflowRequest
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	wf, err := h.svc.AdminUpdateWorkflow(id, body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": wf})
}

func (h *AdminWorkflowHandler) Delete(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if err := h.svc.AdminDeleteWorkflow(id); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}
