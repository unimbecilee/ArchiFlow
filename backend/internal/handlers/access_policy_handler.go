package handlers

import (
	"net/http"
	"strconv"

	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type AccessPolicyHandler struct {
	svc   *services.AccessPolicyService
	audit *services.AuditService
}

func NewAccessPolicyHandler(svc *services.AccessPolicyService, audit *services.AuditService) *AccessPolicyHandler {
	return &AccessPolicyHandler{svc: svc, audit: audit}
}

type accessPolicyBody struct {
	Name      string `json:"name" validate:"required,max=200"`
	Effect    string `json:"effect" validate:"required,oneof=allow deny"`
	Priority  int    `json:"priority" validate:"gte=0"`
	Condition string `json:"condition" validate:"omitempty,max=4000"`
	Actions   string `json:"actions" validate:"omitempty,max=1000"`
	Active    bool   `json:"active"`
}

func (h *AccessPolicyHandler) List(c echo.Context) error {
	rows, err := h.svc.List()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}

func (h *AccessPolicyHandler) Create(c echo.Context) error {
	var body accessPolicyBody
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	p, err := h.svc.Create(services.AccessPolicyInput{
		Name: body.Name, Effect: body.Effect, Priority: body.Priority,
		Condition: body.Condition, Actions: body.Actions, Active: body.Active,
	})
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "admin.access_policy_create", "access_policy", strconv.FormatUint(uint64(p.ID), 10)))
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "data": p})
}

func (h *AccessPolicyHandler) Update(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var body accessPolicyBody
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	p, err := h.svc.Update(id, services.AccessPolicyInput{
		Name: body.Name, Effect: body.Effect, Priority: body.Priority,
		Condition: body.Condition, Actions: body.Actions, Active: body.Active,
	})
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "admin.access_policy_update", "access_policy", strconv.FormatUint(uint64(id), 10)))
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": p})
}

func (h *AccessPolicyHandler) Delete(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if err := h.svc.Delete(id); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "admin.access_policy_delete", "access_policy", strconv.FormatUint(uint64(id), 10)))
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}
