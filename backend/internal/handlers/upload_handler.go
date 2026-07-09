package handlers

import (
	"net/http"
	"strconv"

	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/services"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type UploadHandler struct {
	svc *services.UploadService
}

func NewUploadHandler(svc *services.UploadService) *UploadHandler {
	return &UploadHandler{svc: svc}
}

func (h *UploadHandler) InitSession(c echo.Context) error {
	uid, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	var req dto.InitUploadRequest
	if err := bindJSONStrict(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.InitSession(c.Request().Context(), services.InitUploadInput{
		UserID:      uid,
		IsAdmin:     isAdminFromContext(c),
		FileName:    req.FileName,
		FileSize:    req.FileSize,
		ContentType: req.ContentType,
		FileSHA256:  req.FileSHA256,
		FolderID:    req.FolderID,
		Title:       req.Title,
		Description: req.Description,
		Category:    req.Category,
	})
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "data": resp})
}

func (h *UploadHandler) GetStatus(c echo.Context) error {
	uid, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid session id")
	}
	resp, err := h.svc.GetStatus(c.Request().Context(), sessionID, uid)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": resp})
}

func (h *UploadHandler) PresignPart(c echo.Context) error {
	uid, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid session id")
	}
	partNumber, err := strconv.Atoi(c.Param("n"))
	if err != nil || partNumber < 1 {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid part number")
	}
	resp, err := h.svc.PresignPart(c.Request().Context(), sessionID, uid, partNumber)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": resp})
}

func (h *UploadHandler) Complete(c echo.Context) error {
	uid, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid session id")
	}
	var req dto.CompleteUploadRequest
	if err := bindJSONStrict(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.Complete(c.Request().Context(), sessionID, uid, req.Parts)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": resp})
}

func (h *UploadHandler) Abort(c echo.Context) error {
	uid, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid session id")
	}
	if err := h.svc.Abort(c.Request().Context(), sessionID, uid); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}
