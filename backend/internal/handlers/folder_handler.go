package handlers

import (
	"net/http"
	"strconv"

	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type FolderHandler struct {
	folderService *services.FolderService
}

func NewFolderHandler(folderService *services.FolderService) *FolderHandler {
	return &FolderHandler{folderService: folderService}
}

func parseParentID(c echo.Context) *uint {
	raw := c.QueryParam("parent_id")
	if raw == "" || raw == "null" {
		return nil
	}
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil {
		return nil
	}
	u := uint(id)
	return &u
}

// folderListOrgScope: true only when client explicitly asks for org-wide folder trees (admin/manager).
func folderListOrgScope(c echo.Context) bool {
	return c.QueryParam("org_scope") == "true" && hasOrgDocReadAccess(c)
}

// List GET /api/folders
func (h *FolderHandler) List(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	rows, err := h.folderService.List(userID, folderListOrgScope(c), parseParentID(c))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}

// ListFlat GET /api/folders/flat — liste aplatie avec chemin pour selecteur
func (h *FolderHandler) ListFlat(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	rows, err := h.folderService.ListFlat(userID, folderListOrgScope(c))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}

// Breadcrumb GET /api/folders/:id/breadcrumb
func (h *FolderHandler) Breadcrumb(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	chain, err := h.folderService.Breadcrumb(id, userID, isAdminFromContext(c))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": chain})
}

// Get GET /api/folders/:id
func (h *FolderHandler) Get(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	f, err := h.folderService.Get(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]any{"success": false, "error": "folder not found"})
	}
	if !isAdminFromContext(c) && f.OwnerID != userID {
		return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": "forbidden"})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": f})
}

type folderBody struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description"`
	ParentID    *uint  `json:"parent_id"`
}

// Create POST /api/folders
func (h *FolderHandler) Create(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	var body folderBody
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	f, err := h.folderService.Create(services.CreateFolderInput{
		Name:        body.Name,
		Description: body.Description,
		ParentID:    body.ParentID,
		OwnerID:     userID,
	}, isAdminFromContext(c))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "data": f})
}

// Update PUT /api/folders/:id
func (h *FolderHandler) Update(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var body folderBody
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	f, err := h.folderService.Update(id, userID, isAdminFromContext(c), body.Name, body.Description)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": f})
}

// Delete DELETE /api/folders/:id
func (h *FolderHandler) Delete(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	recursive := c.QueryParam("recursive") == "true"
	if err := h.folderService.Delete(id, userID, isAdminFromContext(c), recursive); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "message": "folder deleted"})
}
