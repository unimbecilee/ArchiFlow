package handlers

import (
	"net/http"
	"strconv"

	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type AdminHandler struct {
	admin *services.AdminService
}

func NewAdminHandler(admin *services.AdminService) *AdminHandler {
	return &AdminHandler{admin: admin}
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
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	resp, err := h.admin.CreateUser(body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusCreated, map[string]any{"success": true, "data": resp})
}

// PatchUser PATCH /api/admin/users/:id
func (h *AdminHandler) PatchUser(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body struct {
		Role     *string `json:"role"`
		IsActive *bool   `json:"is_active"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	u, err := h.admin.UpdateUserLegacy(uint(id), body.Role, body.IsActive)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
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
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	detail, err := h.admin.GetUser(uint(id))
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
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body dto.AdminUpdateUserRequest
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	detail, err := h.admin.UpdateUser(uint(id), body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": detail})
}

// ResendCredentials POST /api/admin/users/:id/resend-credentials
func (h *AdminHandler) ResendCredentials(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	resp, err := h.admin.ResendCredentials(uint(id))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": resp})
}

// SyncPydio POST /api/admin/users/:id/sync-pydio
func (h *AdminHandler) SyncPydio(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	resp, err := h.admin.SyncPydio(uint(id))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": resp})
}

// DeleteUser DELETE /api/admin/users/:id
func (h *AdminHandler) DeleteUser(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	if uint(id) == userID {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "cannot delete yourself"})
	}
	if err := h.admin.DeleteUser(uint(id)); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

// CreateServiceAccount POST /api/admin/users/:id/service-accounts
func (h *AdminHandler) CreateServiceAccount(c echo.Context) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body struct {
		Name        string `json:"name"`
		Username    string `json:"username"`
		Password    string `json:"password"`
		Description string `json:"description"`
		SftpMode    string `json:"sftp_mode"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": "invalid body"})
	}
	sa, err := h.admin.CreateServiceAccount(c.Request().Context(), uint(id), body.Name, body.Username, body.Password, body.Description, body.SftpMode)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
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
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	rows, err := h.admin.ListServiceAccounts(uint(id))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": rows})
}
