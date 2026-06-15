package handlers

import (
	"net/http"

	"archiflow/backend/internal/models"

	"github.com/labstack/echo/v4"
)

func userIDFromContext(c echo.Context) (uint, error) {
	v := c.Get("userID")
	if v == nil {
		return 0, echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}
	id, ok := v.(uint)
	if !ok {
		return 0, echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}
	return id, nil
}

func roleFromContext(c echo.Context) string {
	role, _ := c.Get("role").(string)
	if role == "" {
		return models.RoleUser
	}
	return role
}

func isAdminFromContext(c echo.Context) bool {
	return models.RoleIsAdmin(roleFromContext(c))
}

func hasOrgDocReadAccess(c echo.Context) bool {
	return models.RoleCanViewOrgDocuments(roleFromContext(c))
}

func hasOrgWorkflowView(c echo.Context) bool {
	return models.RoleCanViewOrgWorkflows(roleFromContext(c))
}

func emailFromContext(c echo.Context) (string, error) {
	v, _ := c.Get("email").(string)
	if v == "" {
		return "", echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}
	return v, nil
}
