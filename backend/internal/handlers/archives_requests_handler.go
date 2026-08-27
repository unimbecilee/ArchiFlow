package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type ArchivesRequestsHandler struct {
	archiveService *services.ArchiveService
}

func NewArchivesRequestsHandler(archiveService *services.ArchiveService) *ArchivesRequestsHandler {
	return &ArchivesRequestsHandler{archiveService: archiveService}
}

// Create POST /api/v1/archives-requests — multipart, compatible plugin Cells / Socle.
func (h *ArchivesRequestsHandler) Create(c echo.Context) error {
	maxBytes := int64(services.MAX_CONTENT_LENGTH)
	c.Request().Body = http.MaxBytesReader(c.Response(), c.Request().Body, maxBytes+1<<20)
	if err := c.Request().ParseMultipartForm(maxBytes); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid multipart form or exceeds MAX_CONTENT_LENGTH",
		})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "file is required",
		})
	}
	if file.Size > services.MAX_CONTENT_LENGTH {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   fmt.Sprintf("file exceeds MAX_CONTENT_LENGTH=%d", services.MAX_CONTENT_LENGTH),
		})
	}

	metadata := map[string]any{}
	if raw := c.FormValue("metadata"); raw != "" {
		_ = json.Unmarshal([]byte(raw), &metadata)
	}

	req, err := h.archiveService.CreateFromMultipart(c.Request().Context(), services.CreateArchiveInput{
		UserUUID:      c.FormValue("user_uuid"),
		UserLogin:     c.FormValue("user_login"),
		WorkspaceUUID: c.FormValue("workspace_uuid"),
		Nom:           c.FormValue("nom"),
		Comment:       c.FormValue("comment"),
		Status:        c.FormValue("status"),
		Metadata:      metadata,
		File:          file,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"success": true,
		"message": "Archive request created",
		"data":    req,
	})
}

// List GET /api/v1/archives-requests
func (h *ArchivesRequestsHandler) List(c echo.Context) error {
	limit := 50
	if v := c.QueryParam("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	rows, err := h.archiveService.List(limit)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}
