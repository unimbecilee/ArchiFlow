package handlers

import (
	"io"
	"net/http"
	"strconv"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/services"
	"archiflow/backend/internal/utils"

	"github.com/labstack/echo/v4"
)

type DocumentHandler struct {
	documentService      *services.DocumentService
	collaborationService *services.CollaborationService
	policyService        *services.PolicyService
	auditService         *services.AuditService
}

func NewDocumentHandler(
	documentService *services.DocumentService,
	collaborationService *services.CollaborationService,
	policyService *services.PolicyService,
	auditService *services.AuditService,
) *DocumentHandler {
	return &DocumentHandler{
		documentService:      documentService,
		collaborationService: collaborationService,
		policyService:        policyService,
		auditService:         auditService,
	}
}

func (h *DocumentHandler) ensureDocAccess(c echo.Context, docID uint) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	role := roleFromContext(c)
	if h.policyService != nil {
		ok, _, err := h.policyService.Can(userID, role, docID, services.ActionRead)
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, "document not found")
		}
		if !ok {
			return echo.NewHTTPError(http.StatusForbidden, "forbidden")
		}
		return nil
	}
	if h.collaborationService == nil {
		return nil
	}
	ok, _, err := h.collaborationService.CanAccess(docID, userID, role)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "document not found")
	}
	if !ok {
		return echo.NewHTTPError(http.StatusForbidden, "forbidden")
	}
	return nil
}

func parseFolderIDQuery(c echo.Context) *uint {
	raw := c.QueryParam("folder_id")
	if raw == "" || raw == "null" || raw == "0" {
		return nil
	}
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil {
		return nil
	}
	u := uint(id)
	return &u
}

func documentToView(d models.Document) map[string]any {
	return map[string]any{
		"id":                    d.ID,
		"titre":                 d.Title,
		"title":                 d.Title,
		"description":           d.Description,
		"date_creation":         d.CreatedAt,
		"derniere_modification": d.UpdatedAt,
		"taille":                d.Size,
		"taille_formatee":       services.FormatFileSize(d.Size),
		"type_document":         d.Category,
		"categorie":             d.Category,
		"dossier_id":            d.FolderID,
		"folder_id":             d.FolderID,
		"minio_url":             d.MinioURL,
		"mime_type":             d.MimeType,
		"file_name":             d.FileName,
		"status":                  d.Status,
		"current_version_number":  d.CurrentVersionNumber,
		"rejected_at_version":     d.RejectedAtVersion,
		"previewable":             services.IsPreviewableMime(d.MimeType),
		"editable":                services.IsEditableDocument(d.MimeType, d.FileName),
		"office_editable":         services.IsOfficeDocument(d.MimeType, d.FileName),
		"classification":          d.Classification,
		"department":              d.Department,
		"locked_by_id":          d.LockedByID,
		"locked_at":             d.LockedAt,
		"is_locked":             d.LockedByID != nil,
	}
}

// Lock POST /api/documents/:id/lock
func (h *DocumentHandler) Lock(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.documentService.Lock(uint(id), userID, isAdminFromContext(c)); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "message": "document locked"})
}

// Unlock DELETE /api/documents/:id/lock
func (h *DocumentHandler) Unlock(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.documentService.Unlock(uint(id), userID, isAdminFromContext(c)); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "message": "document unlocked"})
}

func (h *DocumentHandler) documentsJSON(docs []models.Document) []map[string]any {
	views := make([]map[string]any, 0, len(docs))
	for _, d := range docs {
		views = append(views, documentToView(d))
	}
	return views
}

// ListMy GET /api/documents/my
func (h *DocumentHandler) ListMy(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	adminMode := c.QueryParam("admin_mode") == "true"
	docs, err := h.documentService.ListMy(userID, adminMode && hasOrgDocReadAccess(c), parseFolderIDQuery(c))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success":   true,
		"documents": h.documentsJSON(docs),
		"total":     len(docs),
	})
}

// Search GET /api/documents/search?q=
func (h *DocumentHandler) Search(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	q := c.QueryParam("q")
	fullText := c.QueryParam("mode") == "fts" || c.QueryParam("fulltext") == "1"
	docs, err := h.documentService.Search(userID, hasOrgDocReadAccess(c), q, fullText)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success":   true,
		"documents": h.documentsJSON(docs),
		"total":     len(docs),
		"query":     q,
		"fulltext":  fullText,
	})
}

// ListRecent GET /api/documents/recent
func (h *DocumentHandler) ListRecent(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docs, err := h.documentService.ListRecent(userID, hasOrgDocReadAccess(c))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success":   true,
		"documents": h.documentsJSON(docs),
		"total":     len(docs),
	})
}

// ListTrash GET /api/documents/trash
func (h *DocumentHandler) ListTrash(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docs, err := h.documentService.ListTrash(userID, isAdminFromContext(c))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success":   true,
		"documents": h.documentsJSON(docs),
		"total":     len(docs),
	})
}

// Restore POST /api/documents/:id/restore
func (h *DocumentHandler) Restore(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.documentService.Restore(uint(id), userID, isAdminFromContext(c)); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "message": "document restored"})
}

// Get GET /api/documents/:id
func (h *DocumentHandler) Get(c echo.Context) error {
	if _, err := userIDFromContext(c); err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.ensureDocAccess(c, uint(id)); err != nil {
		return err
	}
	doc, err := h.documentService.GetByID(uint(id))
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]any{"success": false, "error": "document not found"})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": documentToView(*doc)})
}

// Upload POST /api/documents/upload
func (h *DocumentHandler) Upload(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	if err := c.Request().ParseMultipartForm(64 << 20); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid form"})
	}
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "file required"})
	}

	var folderID *uint
	if raw := c.FormValue("folder_id"); raw != "" && raw != "null" {
		if id, err := strconv.ParseUint(raw, 10, 64); err == nil {
			u := uint(id)
			folderID = &u
		}
	}

	doc, err := h.documentService.Upload(c.Request().Context(), services.UploadDocumentInput{
		File:        file,
		Title:       c.FormValue("titre"),
		Description: c.FormValue("description"),
		Category:    c.FormValue("type_document"),
		FolderID:    folderID,
		OwnerID:     userID,
		IsAdmin:     isAdminFromContext(c),
	})
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	if h.auditService != nil {
		uid := userID
		_ = h.auditService.Log(models.AuditEvent{
			Source: "api", ActorID: &uid, Action: "document.upload",
			ResourceType: "document", ResourceID: strconv.FormatUint(uint64(doc.ID), 10),
			IP: c.RealIP(), CorrelationID: services.NewCorrelationID(),
		})
	}
	return c.JSON(http.StatusCreated, map[string]any{
		"success": true,
		"message": "document uploaded",
		"data":    documentToView(*doc),
	})
}

func (h *DocumentHandler) auditDoc(c echo.Context, action string, docID uint) {
	if h.auditService == nil {
		return
	}
	uid, _ := userIDFromContext(c)
	var actor *uint
	if uid > 0 {
		actor = &uid
	}
	_ = h.auditService.Log(models.AuditEvent{
		Source: "api", ActorID: actor, Action: action,
		ResourceType: "document", ResourceID: strconv.FormatUint(uint64(docID), 10),
		IP: c.RealIP(), CorrelationID: services.NewCorrelationID(),
	})
}

// Download GET /api/documents/:id/download
func (h *DocumentHandler) Download(c echo.Context) error {
	if _, err := userIDFromContext(c); err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.ensureDocAccess(c, uint(id)); err != nil {
		return err
	}
	reader, mime, filename, err := h.documentService.OpenContentByID(c.Request().Context(), uint(id))
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]any{"success": false, "error": err.Error()})
	}
	defer reader.Close()
	h.auditDoc(c, "document.download", uint(id))

	c.Response().Header().Set("Content-Type", mime)
	if cd := utils.ContentDispositionAttachment(filename); cd != "" {
		c.Response().Header().Set("Content-Disposition", cd)
	}
	return c.Stream(http.StatusOK, mime, reader)
}

// Preview GET /api/documents/:id/preview — stream inline si type supporté
func (h *DocumentHandler) Preview(c echo.Context) error {
	if _, err := userIDFromContext(c); err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.ensureDocAccess(c, uint(id)); err != nil {
		return err
	}

	if c.QueryParam("url") == "1" {
		if !config.PresignedPreviewURLAllowed() {
			return c.JSON(http.StatusForbidden, map[string]any{
				"success": false,
				"error":   "presigned preview URLs disabled in production",
			})
		}
		doc, err := h.documentService.GetByID(uint(id))
		if err != nil {
			return c.JSON(http.StatusNotFound, map[string]any{"success": false, "error": "not found"})
		}
		url, err := config.PresignedGetURL(c.Request().Context(), doc.MinioBucket, doc.MinioObjectName)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]any{"success": true, "url": url})
	}

	reader, mime, filename, err := h.documentService.OpenContentByID(c.Request().Context(), uint(id))
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]any{"success": false, "error": err.Error()})
	}
	defer reader.Close()

	c.Response().Header().Set("Content-Type", mime)
	utils.ApplyPreviewSecurityHeaders(c.Response().Header(), mime)
	if services.IsPreviewableMime(mime) {
		if cd := utils.ContentDispositionInline(filename); cd != "" {
			c.Response().Header().Set("Content-Disposition", cd)
		}
	} else if cd := utils.ContentDispositionAttachment(filename); cd != "" {
		c.Response().Header().Set("Content-Disposition", cd)
	}
	_, copyErr := io.Copy(c.Response().Writer, reader)
	if copyErr != nil {
		return copyErr
	}
	return nil
}

// Patch PATCH /api/documents/:id — deplacer vers un dossier (folder_id null = racine)
func (h *DocumentHandler) Patch(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body struct {
		FolderID *uint `json:"folder_id"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	doc, err := h.documentService.MoveToFolder(uint(id), userID, isAdminFromContext(c), body.FolderID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": documentToView(*doc)})
}

// Delete DELETE /api/documents/:id
func (h *DocumentHandler) Delete(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.documentService.Delete(uint(id), userID, isAdminFromContext(c)); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	h.auditDoc(c, "document.delete", uint(id))
	return c.JSON(http.StatusOK, map[string]any{"success": true, "message": "document deleted"})
}
