package handlers

import (
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"

	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type SftpGoHandler struct {
	auth   *services.SftpGoAuthService
	ingest *services.SFTPIngestService
	audit  *services.AuditService
}

func NewSftpGoHandler(
	auth *services.SftpGoAuthService,
	ingest *services.SFTPIngestService,
	audit *services.AuditService,
) *SftpGoHandler {
	return &SftpGoHandler{auth: auth, ingest: ingest, audit: audit}
}

// Auth POST /api/integrations/sftpgo/auth — external auth hook SFTPGo.
func (h *SftpGoHandler) Auth(c echo.Context) error {
	var req services.SftpGoAuthRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusOK, services.SftpGoAuthResponse{Status: 0})
	}
	resp, err := h.auth.Authenticate(req)
	if err != nil || resp == nil {
		return c.JSON(http.StatusOK, services.SftpGoAuthResponse{Status: 0})
	}
	return c.JSON(http.StatusOK, resp)
}

// Hooks POST /api/integrations/sftpgo/hooks — actions upload/pre-upload/login.
func (h *SftpGoHandler) Hooks(c echo.Context) error {
	var payload services.SftpHookPayload
	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}

	action := strings.ToLower(strings.TrimSpace(payload.Action))
	correlationID := services.NewCorrelationID()

	switch action {
	case "login":
		return c.JSON(http.StatusOK, map[string]any{"status": "ok"})

	case "pre-upload":
		if blocked := blockedExtension(payload.VirtualPath); blocked {
			return c.JSON(http.StatusForbidden, map[string]any{
				"success": false,
				"error":   "file type not allowed",
			})
		}
		maxBytes := sftpMaxUploadBytes()
		if payload.FileSize > maxBytes {
			return c.JSON(http.StatusForbidden, map[string]any{
				"success": false,
				"error":   "file too large",
			})
		}
		return c.JSON(http.StatusOK, map[string]any{"status": "ok"})

	case "upload":
		doc, err := h.ingest.IngestUpload(c.Request().Context(), payload, correlationID)
		if err != nil {
			status := http.StatusOK
			if errors.Is(err, services.ErrIngestValidation) {
				status = http.StatusConflict
			}
			if errors.Is(err, services.ErrIngestLocked) {
				status = http.StatusConflict
			}
			return c.JSON(status, map[string]any{
				"success": false,
				"error":   err.Error(),
				"status":  "rejected",
			})
		}
		return c.JSON(http.StatusOK, map[string]any{
			"success":     true,
			"document_id": doc.ID,
			"status":      "ingested",
		})

	default:
		return c.JSON(http.StatusOK, map[string]any{"status": "ignored", "action": action})
	}
}

func blockedExtension(name string) bool {
	lower := strings.ToLower(name)
	blocked := []string{".html", ".htm", ".svg", ".exe", ".bat", ".cmd", ".js", ".php"}
	for _, ext := range blocked {
		if strings.HasSuffix(lower, ext) {
			return true
		}
	}
	return false
}

func sftpMaxUploadBytes() int64 {
	if raw := strings.TrimSpace(os.Getenv("SFTP_MAX_FILE_BYTES")); raw != "" {
		if n, err := strconv.ParseInt(raw, 10, 64); err == nil && n > 0 {
			return n
		}
	}
	if raw := strings.TrimSpace(os.Getenv("SFTP_MAX_FILE_GB")); raw != "" {
		if n, err := strconv.ParseInt(raw, 10, 64); err == nil && n > 0 {
			return n * (1 << 30)
		}
	}
	return 50 * (1 << 30) // 50 GiB default for MFT large files
}
