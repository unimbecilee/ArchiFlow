package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/services"
	"archiflow/backend/internal/utils"

	"github.com/labstack/echo/v4"
)

type CollaborationHandler struct {
	collab *services.CollaborationService
	audit  *services.AuditService
	policy *services.PolicyService
}

func NewCollaborationHandler(
	collab *services.CollaborationService,
	audit *services.AuditService,
	policy *services.PolicyService,
) *CollaborationHandler {
	return &CollaborationHandler{collab: collab, audit: audit, policy: policy}
}

// Share POST /api/documents/:id/share
func (h *CollaborationHandler) Share(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body struct {
		Email     string   `json:"email"`
		UserID    uint     `json:"user_id"`
		Message   string   `json:"message"`
		Perms     []string `json:"permissions"`
	}
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "corps JSON invalide"})
	}
	if h.policy != nil {
		if err := h.policy.EnsureCan(userID, roleFromContext(c), uint(docID), services.ActionShare); err != nil {
			return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": "vous n'avez pas le droit de partager ce document"})
		}
	}
	if err := h.collab.ShareDocument(uint(docID), userID, roleFromContext(c), body.Email, body.UserID, body.Perms, body.Message); err != nil {
		status, msg := shareErrorResponse(err)
		return c.JSON(status, map[string]any{"success": false, "error": msg})
	}
	if h.policy != nil {
		h.policy.InvalidateCache(userID, uint(docID))
	}
	if h.audit != nil {
		uid := userID
		_ = h.audit.Log(models.AuditEvent{
			Source: "api", ActorID: &uid, Action: "document.share",
			ResourceType: "document", ResourceID: strconv.FormatUint(docID, 10),
			IP: c.RealIP(), CorrelationID: services.NewCorrelationID(),
			Metadata: fmt.Sprintf(`{"email":%q}`, body.Email),
		})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "message": "document partagé"})
}

func shareErrorResponse(err error) (int, string) {
	switch {
	case errors.Is(err, services.ErrShareNoTarget):
		return http.StatusBadRequest, "e-mail ou user_id requis"
	case errors.Is(err, services.ErrShareUserNotFound):
		return http.StatusNotFound, "aucun utilisateur ArchiFlow avec cet e-mail"
	case errors.Is(err, services.ErrShareSelf):
		return http.StatusBadRequest, "impossible de partager avec vous-même"
	case errors.Is(err, services.ErrShareForbidden):
		return http.StatusForbidden, "vous n'avez pas le droit de partager ce document"
	default:
		return http.StatusBadRequest, err.Error()
	}
}

// SharedWithMe GET /api/documents/shared-with-me
func (h *CollaborationHandler) SharedWithMe(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	rows, err := h.collab.ListSharedWithMe(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "documents": rows, "total": len(rows)})
}

// ListComments GET /api/documents/:id/comments
func (h *CollaborationHandler) ListComments(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	rows, err := h.collab.ListComments(uint(docID), userID, roleFromContext(c))
	if err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "comments": rows})
}

// AddComment POST /api/documents/:id/comments
func (h *CollaborationHandler) AddComment(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body struct {
		Content  string `json:"content"`
		ParentID *uint  `json:"parent_id"`
	}
	if err := bindJSONStrict(c, &body); err != nil || body.Content == "" {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "content required"})
	}
	comment, err := h.collab.AddComment(uint(docID), userID, roleFromContext(c), body.Content, body.ParentID)
	if err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "comment": comment})
}

// DeleteComment DELETE /api/documents/:id/comments/:commentId
func (h *CollaborationHandler) DeleteComment(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	cid, _ := strconv.ParseUint(c.Param("commentId"), 10, 64)
	if err := h.collab.DeleteComment(uint(cid), userID, roleFromContext(c)); err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

// GetDocumentContent GET /api/documents/:id/content — texte editable
func (h *CollaborationHandler) GetDocumentContent(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	out, err := h.collab.GetEditableContent(c.Request().Context(), uint(docID), userID, roleFromContext(c))
	if err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": out})
}

// SaveDocumentEdit POST /api/documents/:id/versions/edit
func (h *CollaborationHandler) SaveDocumentEdit(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body struct {
		Content     string `json:"content"`
		Commentaire string `json:"commentaire"`
	}
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	ver, err := h.collab.SaveTextEdit(
		c.Request().Context(),
		uint(docID),
		userID,
		roleFromContext(c),
		body.Content,
		body.Commentaire,
	)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "version": ver})
}

// ListVersions GET /api/documents/:id/versions
func (h *CollaborationHandler) ListVersions(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	rows, err := h.collab.ListVersions(uint(docID), userID, roleFromContext(c))
	if err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "versions": rows})
}

// UploadVersion POST /api/documents/:id/versions
func (h *CollaborationHandler) UploadVersion(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "file required"})
	}
	ver, err := h.collab.UploadVersion(c.Request().Context(), uint(docID), userID, roleFromContext(c), file, c.FormValue("comment"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "version": ver})
}

// DownloadVersion GET /api/documents/:id/versions/:versionId/download
func (h *CollaborationHandler) DownloadVersion(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	versionID, _ := strconv.ParseUint(c.Param("versionId"), 10, 64)
	reader, mime, filename, err := h.collab.OpenVersionContent(
		c.Request().Context(), uint(docID), uint(versionID), userID, roleFromContext(c),
	)
	if err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": err.Error()})
	}
	defer reader.Close()
	c.Response().Header().Set("Content-Type", mime)
	if cd := utils.ContentDispositionAttachment(filename); cd != "" {
		c.Response().Header().Set("Content-Disposition", cd)
	}
	return c.Stream(http.StatusOK, mime, reader)
}

// PreviewVersion GET /api/documents/:id/versions/:versionId/preview
func (h *CollaborationHandler) PreviewVersion(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	versionID, _ := strconv.ParseUint(c.Param("versionId"), 10, 64)
	reader, mime, filename, err := h.collab.OpenVersionContent(
		c.Request().Context(), uint(docID), uint(versionID), userID, roleFromContext(c),
	)
	if err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": err.Error()})
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
	return copyErr
}

// ListTags GET /api/tags
func (h *CollaborationHandler) ListTags(c echo.Context) error {
	rows, err := h.collab.ListTags()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}

// GetDocumentTags GET /api/documents/:id/tags
func (h *CollaborationHandler) GetDocumentTags(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	rows, err := h.collab.GetDocumentTags(uint(docID), userID, roleFromContext(c))
	if err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}

// AddDocumentTag POST /api/documents/:id/tags
func (h *CollaborationHandler) AddDocumentTag(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := bindJSONStrict(c, &body); err != nil || body.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "name required"})
	}
	rows, err := h.collab.AddTagToDocument(uint(docID), userID, roleFromContext(c), body.Name, body.Color)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}

// RemoveDocumentTag DELETE /api/documents/:id/tags/:tagId
func (h *CollaborationHandler) RemoveDocumentTag(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docID, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	tagID, _ := strconv.ParseUint(c.Param("tagId"), 10, 64)
	if err := h.collab.RemoveTag(uint(docID), uint(tagID), userID, roleFromContext(c)); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

// ListNotifications GET /api/notifications
func (h *CollaborationHandler) ListNotifications(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	rows, err := h.collab.ListNotifications(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	unread, _ := h.collab.UnreadCount(userID)
	unreadShares, _ := h.collab.UnreadShareCount(userID)
	return c.JSON(http.StatusOK, map[string]any{
		"success":        true,
		"data":           rows,
		"unread":         unread,
		"unread_shares":  unreadShares,
	})
}

// MarkNotificationRead PUT /api/notifications/:id/read
func (h *CollaborationHandler) MarkNotificationRead(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	_ = h.collab.MarkRead(uint(id), userID)
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

// MarkAllRead PUT /api/notifications/read-all
func (h *CollaborationHandler) MarkAllRead(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	_ = h.collab.MarkAllRead(userID)
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

// StreamNotifications GET /api/notifications/stream — SSE (last_id query).
func (h *CollaborationHandler) StreamNotifications(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	lastID, _ := strconv.ParseUint(c.QueryParam("last_id"), 10, 64)
	sinceID := uint(lastID)

	res := c.Response()
	res.Header().Set("Content-Type", "text/event-stream")
	res.Header().Set("Cache-Control", "no-cache")
	res.Header().Set("Connection", "keep-alive")
	res.WriteHeader(http.StatusOK)

	flusher, ok := res.Writer.(http.Flusher)
	if !ok {
		return echo.NewHTTPError(http.StatusInternalServerError, "streaming unsupported")
	}

	writeEvent := func(event string, payload any) error {
		b, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		if _, err := fmt.Fprintf(res, "event: %s\ndata: %s\n\n", event, b); err != nil {
			return err
		}
		flusher.Flush()
		return nil
	}

	ticker := time.NewTicker(3 * time.Second)
	heartbeat := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	defer heartbeat.Stop()
	lastUnread := int64(-1)
	lastUnreadShares := int64(-1)

	for {
		select {
		case <-c.Request().Context().Done():
			return nil
		case <-heartbeat.C:
			if err := writeEvent("ping", map[string]any{"ts": time.Now().Unix()}); err != nil {
				return nil
			}
		case <-ticker.C:
			rows, unread, err := h.collab.PollNotificationsSince(userID, uint(sinceID))
			if err != nil {
				_ = writeEvent("error", map[string]string{"message": err.Error()})
				continue
			}
			unreadShares, _ := h.collab.UnreadShareCount(userID)
			if len(rows) > 0 && rows[0].ID > sinceID {
				sinceID = rows[0].ID
			}
			if len(rows) == 0 && unread == lastUnread && unreadShares == lastUnreadShares {
				continue
			}
			lastUnread = unread
			lastUnreadShares = unreadShares
			if err := writeEvent("notifications", map[string]any{
				"unread":        unread,
				"unread_shares": unreadShares,
				"items":         rows,
			}); err != nil {
				return nil
			}
		}
	}
}
