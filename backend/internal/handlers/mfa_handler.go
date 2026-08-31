package handlers

import (
	"net/http"

	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type MFAHandler struct {
	mfaService  *services.MFAService
	authService services.AuthService
}

func NewMFAHandler(mfaService *services.MFAService, authService services.AuthService) *MFAHandler {
	return &MFAHandler{mfaService: mfaService, authService: authService}
}

func (h *MFAHandler) InitiateEnrollment(c echo.Context) error {
	email, _ := c.Get("email").(string)
	userID := c.Get("userID").(uint)

	secret, qrCodeURL, err := h.mfaService.GenerateSecret("ArchiFlow", email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Success: false, Message: "failed to generate MFA secret",
		})
	}
	if err := h.authService.StorePendingMFASecret(userID, secret); err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Success: false, Message: "failed to store MFA secret",
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Message: "MFA enrollment initiated",
		Data: map[string]any{
			"secret":      secret,
			"qr_code_url": qrCodeURL,
			"issuer":      "ArchiFlow",
		},
	})
}

func (h *MFAHandler) ConfirmEnrollment(c echo.Context) error {
	userID := c.Get("userID").(uint)

	var req dto.MFAConfirmRequest
	if err := bindJSONStrict(c, &req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false, Message: "invalid request",
		})
	}

	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Success: false, Message: "user not found",
		})
	}

	secret := req.Secret
	if secret == "" {
		secret = user.MFASecret
	}
	if !h.mfaService.ValidateCode(secret, req.Code) {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false, Message: "invalid code",
		})
	}

	recoveryCodes, _ := h.mfaService.GenerateRecoveryCodes(10)
	encodedCodes, _ := h.mfaService.EncodeRecoveryCodes(recoveryCodes)

	if err := h.authService.EnableMFA(userID, secret, encodedCodes); err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Success: false, Message: "failed to enable MFA",
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Message: "MFA enabled successfully",
		Data: map[string]any{
			"recovery_codes": recoveryCodes,
		},
	})
}

func (h *MFAHandler) DisableMFA(c echo.Context) error {
	userID := c.Get("userID").(uint)

	var req struct {
		Password string `json:"password" validate:"required"`
	}
	if err := bindJSONStrict(c, &req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false, Message: "password required",
		})
	}

	if err := h.authService.VerifyPassword(userID, req.Password); err != nil {
		return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Success: false, Message: "invalid password",
		})
	}

	if err := h.authService.DisableMFA(userID); err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Success: false, Message: "failed to disable MFA",
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true, Message: "MFA disabled",
	})
}

func (h *MFAHandler) GetMFAStatus(c echo.Context) error {
	userID := c.Get("userID").(uint)
	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Success: false, Message: "user not found",
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Data: map[string]any{
			"mfa_enabled": user.MFAEnabled,
		},
	})
}

func (h *MFAHandler) RegenerateRecoveryCodes(c echo.Context) error {
	userID := c.Get("userID").(uint)

	var req struct {
		Password string `json:"password" validate:"required"`
	}
	if err := bindJSONStrict(c, &req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false, Message: "password required",
		})
	}

	if err := h.authService.VerifyPassword(userID, req.Password); err != nil {
		return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Success: false, Message: "invalid password",
		})
	}

	recoveryCodes, _ := h.mfaService.GenerateRecoveryCodes(10)
	encodedCodes, _ := h.mfaService.EncodeRecoveryCodes(recoveryCodes)

	if err := h.authService.UpdateRecoveryCodes(userID, encodedCodes); err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Success: false, Message: "failed to regenerate codes",
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Success: true,
		Message: "Recovery codes regenerated",
		Data: map[string]any{
			"recovery_codes": recoveryCodes,
		},
	})
}