package handlers

import (
	"net/http"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type AuthHandler struct {
	authService services.AuthService
}

func NewAuthHandler(authService services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// PublicConfig GET /api/auth/config — flags for login UI (no auth).
func (h *AuthHandler) PublicConfig(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"allow_public_register": config.PublicRegisterAllowed(),
		},
	})
}

func (h *AuthHandler) Register(c echo.Context) error {
	var req dto.RegisterRequest
	if err := bindJSONStrict(c, &req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Message: "Invalid request body",
		})
	}

	resp, err := h.authService.Register(req, sessionMeta(c))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	setRefreshTokenCookie(c, resp.RefreshToken)
	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Success: true,
		Message: "User registered successfully",
		Data: map[string]any{
			"user":  resp.User,
			"token": resp.Token,
		},
	})
}

func (h *AuthHandler) Login(c echo.Context) error {
	var req dto.LoginRequest
	if err := bindJSONStrict(c, &req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Message: "Invalid request body",
		})
	}

	resp, err := h.authService.Login(req, sessionMeta(c))
	if err != nil {
		return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	setRefreshTokenCookie(c, resp.RefreshToken)
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Message: "Login successful",
		Data: map[string]any{
			"user":  resp.User,
			"token": resp.Token,
		},
	})
}

func (h *AuthHandler) RefreshToken(c echo.Context) error {
	refreshToken := readRefreshTokenCookie(c)
	if refreshToken == "" {
		var req dto.RefreshRequest
		if err := bindJSONOptionalStrict(c, &req); err != nil {
			return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Success: false,
				Message: "Invalid request body",
			})
		}
		refreshToken = req.RefreshToken
	}
	if refreshToken == "" {
		return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Success: false,
			Message: "refresh token required",
		})
	}

	resp, err := h.authService.RefreshToken(refreshToken, sessionMeta(c))
	if err != nil {
		clearRefreshTokenCookie(c)
		return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	setRefreshTokenCookie(c, resp.RefreshToken)
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Message: "Token refreshed successfully",
		Data: map[string]any{
			"token": resp.Token,
		},
	})
}

// ClearSession POST /api/auth/logout (public) — révoque session + efface cookie.
func (h *AuthHandler) ClearSession(c echo.Context) error {
	refreshToken := readRefreshTokenCookie(c)
	_ = h.authService.RevokeRefreshSession(refreshToken)
	clearRefreshTokenCookie(c)
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Message: "Session cleared",
	})
}

func (h *AuthHandler) Logout(c echo.Context) error {
	userID := c.Get("userID").(uint)
	refreshToken := readRefreshTokenCookie(c)

	if err := h.authService.Logout(userID, refreshToken); err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	clearRefreshTokenCookie(c)
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Message: "Logout successful",
	})
}

func (h *AuthHandler) GetMe(c echo.Context) error {
	userID := c.Get("userID").(uint)

	user, err := h.authService.GetMe(userID)
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Data:    user,
	})
}

func (h *AuthHandler) UpdateProfile(c echo.Context) error {
	userID := c.Get("userID").(uint)

	var req dto.UpdateProfileRequest
	if err := bindJSONStrict(c, &req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Message: "Invalid request body",
		})
	}

	user, err := h.authService.UpdateProfile(userID, req)
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Message: "Profile updated successfully",
		Data:    user,
	})
}

func (h *AuthHandler) ChangePassword(c echo.Context) error {
	userID := c.Get("userID").(uint)

	var req dto.ChangePasswordRequest
	if err := bindJSONStrict(c, &req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Message: "Invalid request body",
		})
	}

	if err := h.authService.ChangePassword(userID, req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Message: "Password changed successfully",
	})
}
