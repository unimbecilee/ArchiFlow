package handlers

import (
	"net/http"

	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type OIDCHandler struct {
	oidcService *services.OIDCService
	authService services.AuthService
}

func NewOIDCHandler(oidcService *services.OIDCService, authService services.AuthService) *OIDCHandler {
	return &OIDCHandler{oidcService: oidcService, authService: authService}
}

func (h *OIDCHandler) Login(c echo.Context) error {
	if h.oidcService == nil || !h.oidcService.Enabled() {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Success: false, Message: "SSO not configured"})
	}
	state, err := services.GenerateState()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Success: false, Message: "state generation failed"})
	}
	c.SetCookie(&http.Cookie{Name: "oidc_state", Value: state, Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode})
	url := h.oidcService.AuthCodeURL(state)
	return c.Redirect(http.StatusFound, url)
}

func (h *OIDCHandler) Callback(c echo.Context) error {
	if h.oidcService == nil || !h.oidcService.Enabled() {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Success: false, Message: "SSO not configured"})
	}
	stateCookie, err := c.Cookie("oidc_state")
	if err != nil || c.QueryParam("state") != stateCookie.Value {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "invalid state"})
	}
	code := c.QueryParam("code")
	if code == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "missing code"})
	}
	ctx := c.Request().Context()
	token, err := h.oidcService.Exchange(ctx, code)
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "token exchange failed: " + err.Error()})
	}
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "no id_token"})
	}
	idToken, err := h.oidcService.VerifyIDToken(ctx, rawIDToken)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{Success: false, Message: "id_token verify failed"})
	}
	var claims struct {
		Email     string `json:"email"`
		Name      string `json:"name"`
		GivenName string `json:"given_name"`
		FamilyName string `json:"family_name"`
	}
	if err := idToken.Claims(&claims); err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Success: false, Message: "claims parse failed"})
	}
	if claims.Email == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "email claim missing"})
	}
	// provision or link user
	return c.JSON(http.StatusOK, dto.SuccessResponse{Success: true, Message: "SSO callback ok", Data: map[string]string{"email": claims.Email}})
}
