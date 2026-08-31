package handlers

import (
	"net/http"
	"strconv"
	"time"

	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type ShareHandler struct {
	shareService *services.ShareService
	audit        *services.AuditService
}

func NewShareHandler(shareService *services.ShareService, audit *services.AuditService) *ShareHandler {
	return &ShareHandler{shareService: shareService, audit: audit}
}

type createShareRequest struct {
	DocumentID       uint    `json:"document_id" validate:"required"`
	ExpiresAt        *string `json:"expires_at,omitempty"`
	MaxDownloads     int     `json:"max_downloads"`
	Password         string  `json:"password,omitempty"`
	Permissions      []string `json:"permissions"`
	WatermarkEnabled bool    `json:"watermark_enabled"`
	WatermarkText    string  `json:"watermark_text,omitempty"`
}

type createFileRequestRequest struct {
	FolderID       *uint  `json:"folder_id,omitempty"`
	Title          string `json:"title" validate:"required,max=255"`
	Description    string `json:"description,omitempty"`
	ExpiresAt      *string `json:"expires_at,omitempty"`
	MaxFiles       int    `json:"max_files" validate:"gte=1"`
	MaxFileSizeMB  int    `json:"max_file_size_mb" validate:"gte=1"`
	AllowedTypes   string `json:"allowed_types,omitempty"`
	Password       string `json:"password,omitempty"`
	NotifyOnUpload bool   `json:"notify_on_upload"`
}

func (h *ShareHandler) CreateShare(c echo.Context) error {
	userID := c.Get("userID").(uint)
	var req createShareRequest
	if err := bindJSONStrict(c, &req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "invalid request"})
	}
	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "invalid expires_at format"})
		}
		expiresAt = &t
	}
	share, err := h.shareService.CreateShare(c.Request().Context(), userID, req.DocumentID, services.CreateShareRequest{
		ExpiresAt: expiresAt, MaxDownloads: req.MaxDownloads, Password: req.Password,
		Permissions: req.Permissions, WatermarkEnabled: req.WatermarkEnabled, WatermarkText: req.WatermarkText,
	})
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "share.create", "external_share", strconv.FormatUint(uint64(share.ID), 10)))
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Success: true, Message: "Share created", Data: share})
}

func (h *ShareHandler) ListShares(c echo.Context) error {
	userID := c.Get("userID").(uint)
	admin := c.Get("role").(string) == "admin"
	shares, err := h.shareService.ListShares(c.Request().Context(), userID, admin)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Success: true, Data: shares})
}

func (h *ShareHandler) RevokeShare(c echo.Context) error {
	userID := c.Get("userID").(uint)
	admin := c.Get("role").(string) == "admin"
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if err := h.shareService.RevokeShare(c.Request().Context(), id, userID, admin); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "share.revoke", "external_share", strconv.FormatUint(uint64(id), 10)))
	return c.JSON(http.StatusOK, dto.SuccessResponse{Success: true, Message: "Share revoked"})
}

func (h *ShareHandler) AccessShare(c echo.Context) error {
	token := c.Param("token")
	password := c.QueryParam("password")
	share, err := h.shareService.AccessShare(c.Request().Context(), token, password, c.RealIP(), c.Request().UserAgent())
	if err != nil {
		return c.JSON(http.StatusForbidden, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Success: true, Data: share})
}

func (h *ShareHandler) DownloadShare(c echo.Context) error {
	token := c.Param("token")
	password := c.QueryParam("password")
	share, err := h.shareService.AccessShare(c.Request().Context(), token, password, c.RealIP(), c.Request().UserAgent())
	if err != nil {
		return c.JSON(http.StatusForbidden, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	reader, mime, filename, err := h.shareService.DownloadFile(c.Request().Context(), share)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	defer reader.Close()
	c.Response().Header().Set("Content-Type", mime)
	c.Response().Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	return c.Stream(http.StatusOK, mime, reader)
}

func (h *ShareHandler) PreviewShare(c echo.Context) error {
	token := c.Param("token")
	password := c.QueryParam("password")
	share, err := h.shareService.AccessShare(c.Request().Context(), token, password, c.RealIP(), c.Request().UserAgent())
	if err != nil {
		return c.JSON(http.StatusForbidden, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	reader, mime, err := h.shareService.PreviewFile(c.Request().Context(), share)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	defer reader.Close()
	c.Response().Header().Set("Content-Type", mime)
	return c.Stream(http.StatusOK, mime, reader)
}

func (h *ShareHandler) CreateFileRequest(c echo.Context) error {
	var req createFileRequestRequest
	if err := bindJSONStrict(c, &req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "invalid request"})
	}
	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "invalid expires_at format"})
		}
		expiresAt = &t
	}
	fr, err := h.shareService.CreateFileRequest(c.Request().Context(), c.Get("userID").(uint), services.CreateFileRequestRequest{
		FolderID: req.FolderID, Title: req.Title, Description: req.Description,
		ExpiresAt: expiresAt, MaxFiles: req.MaxFiles, MaxFileSizeMB: req.MaxFileSizeMB,
		AllowedTypes: req.AllowedTypes, Password: req.Password, NotifyOnUpload: req.NotifyOnUpload,
	})
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Success: true, Message: "File request created", Data: fr})
}

func (h *ShareHandler) UploadFileRequestMultipart(c echo.Context) error {
	token := c.FormValue("token")
	if token == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "token required"})
	}
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "file required"})
	}
	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Success: false, Message: "cannot open file"})
	}
	defer src.Close()
	upload, err := h.shareService.UploadToFileRequest(c.Request().Context(), token, services.FileUpload{
		FileName: file.Filename, Size: file.Size, MimeType: file.Header.Get("Content-Type"), Reader: src, UploadedBy: c.RealIP(),
	})
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Success: true, Message: "File uploaded", Data: upload})
}
