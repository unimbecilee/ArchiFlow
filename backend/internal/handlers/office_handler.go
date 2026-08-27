package handlers

import (
	"io"
	"net/http"
	"strconv"

	"archiflow/backend/internal/services"
	"archiflow/backend/internal/utils"

	"github.com/labstack/echo/v4"
)

type OfficeHandler struct {
	office *services.OfficeService
}

func NewOfficeHandler(office *services.OfficeService) *OfficeHandler {
	return &OfficeHandler{office: office}
}

// EditorConfig GET /api/documents/:id/office/config
func (h *OfficeHandler) EditorConfig(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	email, _ := emailFromContext(c)
	cfg, err := h.office.GetEditorConfig(c.Request().Context(), id, userID, roleFromContext(c), email)
	if err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": cfg})
}

// DownloadFile GET /api/office/files/:id/:token — appele par OnlyOffice Document Server
func (h *OfficeHandler) DownloadFile(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	token, err := requirePathParam(c, "token")
	if err != nil {
		return err
	}
	_, userID, err := h.office.ParseToken(token, "download")
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]any{"error": err.Error()})
	}
	rc, mime, name, err := h.office.StreamDocument(c.Request().Context(), id, userID, token)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]any{"error": err.Error()})
	}
	defer rc.Close()
	c.Response().Header().Set("Content-Type", mime)
	if cd := utils.ContentDispositionAttachment(name); cd != "" {
		c.Response().Header().Set("Content-Disposition", cd)
	}
	return c.Stream(http.StatusOK, mime, rc)
}

// Callback POST /api/office/callback/:id/:token
func (h *OfficeHandler) Callback(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	token, err := requirePathParam(c, "token")
	if err != nil {
		return err
	}
	_, userID, err := h.office.ParseToken(token, "callback")
	if err != nil {
		return c.JSON(http.StatusOK, map[string]any{"error": 1, "message": err.Error()})
	}
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusOK, map[string]any{"error": 1})
	}
	if err := h.office.ProcessCallback(c.Request().Context(), id, userID, token, body); err != nil {
		return c.JSON(http.StatusOK, map[string]any{"error": 1, "message": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"error": 0})
}

// WopiCheckFileInfo GET /api/wopi/files/:id
func (h *OfficeHandler) WopiCheckFileInfo(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	token, err := requireQueryParam(c, "access_token")
	if err != nil {
		return err
	}
	info, err := h.office.WopiCheckFileInfo(c.Request().Context(), id, token)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]any{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, info)
}

// WopiGetFile GET /api/wopi/files/:id/contents
func (h *OfficeHandler) WopiGetFile(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	token, err := requireQueryParam(c, "access_token")
	if err != nil {
		return err
	}
	rc, mime, size, err := h.office.WopiGetFile(c.Request().Context(), id, token)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]any{"error": err.Error()})
	}
	defer rc.Close()
	c.Response().Header().Set("Content-Type", mime)
	if size > 0 {
		c.Response().Header().Set("Content-Length", strconv.FormatInt(size, 10))
	}
	return c.Stream(http.StatusOK, mime, rc)
}

// WopiPutFile POST /api/wopi/files/:id/contents
func (h *OfficeHandler) WopiPutFile(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	token, err := requireQueryParam(c, "access_token")
	if err != nil {
		return err
	}
	if err := h.office.WopiPutFile(c.Request().Context(), id, token, c.Request().Body); err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{})
}
