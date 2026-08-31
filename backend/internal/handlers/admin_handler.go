package handlers

import (
	"net/http"
	"strconv"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type AdminHandler struct {
	admin *services.AdminService
	audit *services.AuditService
}

func NewAdminHandler(admin *services.AdminService, audit *services.AuditService) *AdminHandler {
	return &AdminHandler{admin: admin, audit: audit}
}

func requireAdmin(c echo.Context) error {
	if !isAdminFromContext(c) {
		return echo.NewHTTPError(http.StatusForbidden, "admin only")
	}
	return nil
}

// ListUsers GET /api/admin/users
func (h *AdminHandler) ListUsers(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	users, err := h.admin.ListUsers(200, 0)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	rows := make([]dto.UserResponse, 0, len(users))
	for _, u := range users {
		rows = append(rows, dto.UserResponse{
			ID:                 u.ID,
			Email:              u.Email,
			FirstName:          u.FirstName,
			LastName:           u.LastName,
			Role:               u.Role,
			AvatarURL:          u.AvatarURL,
			IsActive:           u.IsActive,
			MustChangePassword: u.MustChangePassword,
			PydioLinked:        u.PydioPasswordEnc != "",
			LastLoginAt:        u.LastLoginAt,
			CreatedAt:          u.CreatedAt,
		})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows, "total": len(rows)})
}

// CreateUser POST /api/admin/users
func (h *AdminHandler) CreateUser(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	var body dto.AdminCreateUserRequest
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	resp, err := h.admin.CreateUser(body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "admin.user_create", "user", strconv.FormatUint(uint64(resp.User.ID), 10)))
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "data": resp})
}

type adminPatchUserBody struct {
	Role     *string `json:"role" validate:"omitempty,oneof=admin manager user validator archivist"`
	IsActive *bool   `json:"is_active"`
}

// PatchUser PATCH /api/admin/users/:id
func (h *AdminHandler) PatchUser(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var body adminPatchUserBody
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	u, err := h.admin.UpdateUserLegacy(id, body.Role, body.IsActive)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "admin.user_update", "user", strconv.FormatUint(uint64(id), 10)))
	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data": dto.UserResponse{
			ID:        u.ID,
			Email:     u.Email,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			Role:      u.Role,
			IsActive:  u.IsActive,
			CreatedAt: u.CreatedAt,
		},
	})
}

// GetUser GET /api/admin/users/:id
func (h *AdminHandler) GetUser(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	detail, err := h.admin.GetUser(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": detail})
}

// PutUser PUT /api/admin/users/:id
func (h *AdminHandler) PutUser(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var body dto.AdminUpdateUserRequest
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	detail, err := h.admin.UpdateUser(id, body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "admin.user_update", "user", strconv.FormatUint(uint64(id), 10)))
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": detail})
}

// ResendCredentials POST /api/admin/users/:id/resend-credentials
func (h *AdminHandler) ResendCredentials(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.admin.ResendCredentials(id)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "admin.user_resend_credentials", "user", strconv.FormatUint(uint64(id), 10)))
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": resp})
}

// SyncPydio POST /api/admin/users/:id/sync-pydio
func (h *AdminHandler) SyncPydio(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.admin.SyncPydio(id)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "admin.user_sync_pydio", "user", strconv.FormatUint(uint64(id), 10)))
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": resp})
}

// DeleteUser DELETE /api/admin/users/:id
func (h *AdminHandler) DeleteUser(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	if id == userID {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "cannot delete yourself"})
	}
	if err := h.admin.DeleteUser(id); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "admin.user_delete", "user", strconv.FormatUint(uint64(id), 10)))
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

type adminServiceAccountBody struct {
	Name        string `json:"name" validate:"required,max=200"`
	Username    string `json:"username" validate:"required,max=128"`
	Password    string `json:"password" validate:"required,min=8"`
	Description string `json:"description" validate:"omitempty,max=1000"`
	SftpMode    string `json:"sftp_mode" validate:"omitempty,oneof=none drop inbox full"`
}

// CreateServiceAccount POST /api/admin/users/:id/service-accounts
func (h *AdminHandler) CreateServiceAccount(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var body adminServiceAccountBody
	if err := bindJSONStrict(c, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	sa, err := h.admin.CreateServiceAccount(c.Request().Context(), id, body.Name, body.Username, body.Password, body.Description, body.SftpMode)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	logAudit(h.audit, newAuditEvent(c, "admin.service_account_create", "service_account", strconv.FormatUint(uint64(sa.ID), 10)))
	return c.JSON(http.StatusCreated, map[string]any{
		"success": true,
		"data": map[string]any{
			"id":                sa.ID,
			"name":              sa.Name,
			"sftpgo_username":   sa.SftpGoUsername,
			"archiflow_user_id": sa.ArchiflowUserID,
			"sftp_mode":         sa.SftpMode,
			"is_active":         sa.IsActive,
		},
	})
}

// ListServiceAccounts GET /api/admin/users/:id/service-accounts
func (h *AdminHandler) ListServiceAccounts(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	rows, err := h.admin.ListServiceAccounts(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}

func (h *AdminHandler) AuditVerify(c echo.Context) error {
	if h.audit == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]any{"success": false, "error": "audit service unavailable"})
	}
	res, err := h.audit.VerifyChain(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"checked":     res.Checked,
			"mismatches":  res.Mismatches,
			"first_bad_id": res.FirstBadID,
		},
	})
}

func (h *AdminHandler) FeatureFlags(c echo.Context) error {
	flags := config.LoadFeatureFlags()
	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    flags,
	})
}
