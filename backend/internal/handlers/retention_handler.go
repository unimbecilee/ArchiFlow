package handlers

import (
	"net/http"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type RetentionHandler struct {
	svc *services.RetentionService
}

func NewRetentionHandler(svc *services.RetentionService) *RetentionHandler {
	return &RetentionHandler{svc: svc}
}

type createPolicyBody struct {
	Name           string `json:"name" validate:"required,min=2,max=100"`
	DurationYears  int    `json:"duration_years" validate:"required,min=1,max=100"`
	Classification string `json:"classification" validate:"omitempty,max=32"`
}

type holdBody struct {
	Reason string `json:"reason" validate:"required,min=3,max=500"`
}

func (h *RetentionHandler) ListPolicies(c echo.Context) error {
	rows, err := h.svc.ListPolicies(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}

func (h *RetentionHandler) CreatePolicy(c echo.Context) error {
	var body createPolicyBody
	if err := bindJSONStrict(c, &body); err != nil {
		return err
	}
	p := &models.RetentionPolicy{
		Name:           body.Name,
		DurationYears:  body.DurationYears,
		Classification: body.Classification,
	}
	if err := h.svc.CreatePolicy(c.Request().Context(), p); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "data": p})
}

func (h *RetentionHandler) Hold(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var body holdBody
	if err := bindJSONStrict(c, &body); err != nil {
		return err
	}
	if err := h.svc.HoldDocument(c.Request().Context(), docID, userID, body.Reason); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

func (h *RetentionHandler) Release(c echo.Context) error {
	holdID, err := parseUintParam(c, "holdId")
	if err != nil {
		return err
	}
	if err := h.svc.ReleaseHold(c.Request().Context(), holdID); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

func (h *RetentionHandler) Status(c echo.Context) error {
	docID, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	onHold, err := h.svc.IsOnHold(c.Request().Context(), docID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	var hold *models.LegalHold
	if onHold {
		hold, _ = h.svc.ActiveHold(c.Request().Context(), docID)
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "on_hold": onHold, "hold": hold})
}
