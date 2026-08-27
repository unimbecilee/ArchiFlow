package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type PydioHandler struct {
	archiveService  *services.ArchiveService
	documentService *services.DocumentService
}

func NewPydioHandler(archiveService *services.ArchiveService, documentService *services.DocumentService) *PydioHandler {
	return &PydioHandler{archiveService: archiveService, documentService: documentService}
}

type pydioArchivePayload struct {
	DocumentID   string         `json:"document_id" validate:"required"`
	DocumentName string         `json:"document_name" validate:"required"`
	Workspace    string         `json:"workspace"`
	Path         string         `json:"path"`
	User         string         `json:"user" validate:"required"`
	UserEmail    string         `json:"user_email"`
	Metadata     map[string]any `json:"metadata"`
}

// Health GET /api/v1/pydio/health
func (h *PydioHandler) Health(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]any{
		"status":  "ok",
		"service": "archiflow-pydio-bridge",
	})
}

// Stats GET /api/v1/pydio/stats
func (h *PydioHandler) Stats(c echo.Context) error {
	stats, err := h.archiveService.PydioStats()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, stats)
}

// CreateArchiveRequest POST /api/v1/pydio/archive-requests
func (h *PydioHandler) CreateArchiveRequest(c echo.Context) error {
	var payload pydioArchivePayload
	if err := bindJSONStrict(c, &payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"error": "invalid JSON"})
	}

	req, err := h.archiveService.CreatePydioArchiveRequest(services.PydioArchiveInput{
		DocumentID:   payload.DocumentID,
		DocumentName: payload.DocumentName,
		Workspace:    payload.Workspace,
		Path:         payload.Path,
		UserLogin:    payload.User,
		UserEmail:    payload.UserEmail,
		Metadata:     payload.Metadata,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"success": true,
		"data":    req,
	})
}

// ListArchiveRequests GET /api/v1/pydio/archive-requests
func (h *PydioHandler) ListArchiveRequests(c echo.Context) error {
	rows, err := h.archiveService.ListPydio(100)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}

type pydioSyncPayload struct {
	PydioNodeID string         `json:"pydio_node_id" validate:"required"`
	Name        string         `json:"name" validate:"required"`
	Path        string         `json:"path" validate:"required"`
	MimeType    string         `json:"mime_type"`
	Size        int64          `json:"size"`
	Workspace   string         `json:"workspace"`
	Metadata    map[string]any `json:"metadata"`
	DocumentID  *uint          `json:"archiflow_document_id"`
}

// SyncDocument POST /api/v1/pydio/documents/sync
func (h *PydioHandler) SyncDocument(c echo.Context) error {
	var payload pydioSyncPayload
	if err := bindJSONStrict(c, &payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"error": "invalid JSON"})
	}
	meta := ""
	if payload.Metadata != nil {
		b, _ := json.Marshal(payload.Metadata)
		meta = string(b)
	}
	row, err := h.documentService.UpsertPydioSync(services.PydioSyncInput{
		PydioNodeID: payload.PydioNodeID,
		Name:        payload.Name,
		Path:        payload.Path,
		MimeType:    payload.MimeType,
		Size:        payload.Size,
		Workspace:   payload.Workspace,
		Metadata:    meta,
		DocumentID:  payload.DocumentID,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": row})
}

// DeleteSync DELETE /api/v1/pydio/documents/sync/:node_id
func (h *PydioHandler) DeleteSync(c echo.Context) error {
	nodeID, err := requirePathParam(c, "node_id")
	if err != nil {
		return err
	}
	if err := h.documentService.DeletePydioSync(nodeID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

// ListSync GET /api/v1/pydio/documents/sync
func (h *PydioHandler) ListSync(c echo.Context) error {
	rows, err := h.documentService.ListPydioSync(100)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}

func (h *PydioHandler) handleWebhook(c echo.Context, event string) error {
	pathNodeID, err := requirePathParam(c, "node_id")
	if err != nil {
		return err
	}
	body, _ := io.ReadAll(io.LimitReader(c.Request().Body, 1<<20))
	_ = h.archiveService.LogWebhook(event, pathNodeID, string(body))

	var payload map[string]any
	_ = json.Unmarshal(body, &payload)

	nodeID := ""
	if v, ok := payload["Uuid"].(string); ok {
		nodeID = v
	}
	if nodeID == "" {
		nodeID = pathNodeID
	}

	name, _ := payload["Path"].(string)
	path := name
	if v, ok := payload["WorkspacePath"].(string); ok && v != "" {
		path = v
	}
	mime, _ := payload["MimeType"].(string)
	var size int64
	if v, ok := payload["Size"].(float64); ok {
		size = int64(v)
	}

	switch event {
	case "node-deleted":
		if nodeID != "" {
			_ = h.documentService.DeletePydioSync(nodeID)
		}
	case "node-created", "node-updated":
		if nodeID != "" && name != "" {
			meta, _ := json.Marshal(payload)
			_, _ = h.documentService.UpsertPydioSync(services.PydioSyncInput{
				PydioNodeID: nodeID,
				Name:        name,
				Path:        path,
				MimeType:    mime,
				Size:        size,
				Metadata:    string(meta),
			})
		}
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"event":   event,
		"node_id": nodeID,
	})
}

// WebhookNodeCreated POST /api/v1/pydio/webhooks/node-created
func (h *PydioHandler) WebhookNodeCreated(c echo.Context) error {
	return h.handleWebhook(c, "node-created")
}

// WebhookNodeUpdated POST /api/v1/pydio/webhooks/node-updated
func (h *PydioHandler) WebhookNodeUpdated(c echo.Context) error {
	return h.handleWebhook(c, "node-updated")
}

// WebhookNodeDeleted POST /api/v1/pydio/webhooks/node-deleted
func (h *PydioHandler) WebhookNodeDeleted(c echo.Context) error {
	return h.handleWebhook(c, "node-deleted")
}
