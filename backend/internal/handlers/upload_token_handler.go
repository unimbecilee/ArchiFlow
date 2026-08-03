package handlers

import (
	"net/http"

	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type UploadTokenHandler struct {
	svc *services.UploadTokenService
}

func NewUploadTokenHandler(svc *services.UploadTokenService) *UploadTokenHandler {
	return &UploadTokenHandler{svc: svc}
}

type uploadTokenRequest struct {
	FolderID *uint                         `json:"folder_id"`
	Files    []services.UploadTokenFileIn  `json:"files"`
}

// MintToken POST /api/upload/token
func (h *UploadTokenHandler) MintToken(c echo.Context) error {
	uid, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	var req uploadTokenRequest
	if err := bindJSONStrict(c, &req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	resp, err := h.svc.MintToken(c.Request().Context(), uid, isAdminFromContext(c), req.FolderID, req.Files)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": resp})
}

// RefreshToken POST /api/upload/token/refresh
func (h *UploadTokenHandler) RefreshToken(c echo.Context) error {
	uid, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	token, expiresIn, base, err := h.svc.RefreshToken(c.Request().Context(), uid)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"token":         token,
			"expires_in":    expiresIn,
			"uploadUrlBase": base,
		},
	})
}
