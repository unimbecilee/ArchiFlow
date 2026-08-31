package handlers

import (
	"net/http"
	"strconv"

	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type SCIMHandler struct {
	scimService *services.SCIMService
}

func NewSCIMHandler(scimService *services.SCIMService) *SCIMHandler {
	return &SCIMHandler{scimService: scimService}
}

func scimUser(u models.User) map[string]any {
	return map[string]any{
		"schemas":  []string{"urn:ietf:params:scim:schemas:core:2.0:User"},
		"id":       strconv.FormatUint(uint64(u.ID), 10),
		"userName": u.Email,
		"name":     map[string]string{"givenName": u.FirstName, "familyName": u.LastName},
		"emails":   []map[string]string{{"value": u.Email, "primary": "true"}},
		"active":   u.IsActive,
		"meta":     map[string]string{"resourceType": "User"},
	}
}

func (h *SCIMHandler) ListUsers(c echo.Context) error {
	users, err := h.scimService.ListUsers(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	resources := make([]map[string]any, 0, len(users))
	for _, u := range users {
		resources = append(resources, scimUser(u))
	}
	return c.JSON(http.StatusOK, map[string]any{
		"schemas":      []string{"urn:ietf:params:scim:api:messages:2.0:ListResponse"},
		"totalResults": len(resources),
		"Resources":    resources,
	})
}

func (h *SCIMHandler) GetUser(c echo.Context) error {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	user, err := h.scimService.GetUser(c.Request().Context(), uint(id))
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Success: false, Message: "user not found"})
	}
	return c.JSON(http.StatusOK, scimUser(*user))
}

func (h *SCIMHandler) CreateUser(c echo.Context) error {
	var body struct {
		UserName string `json:"userName"`
		Name     struct {
			GivenName  string `json:"givenName"`
			FamilyName string `json:"familyName"`
		} `json:"name"`
		Emails []struct{ Value string `json:"value"` } `json:"emails"`
		Active *bool `json:"active"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "invalid body"})
	}
	email := body.UserName
	if len(body.Emails) > 0 {
		email = body.Emails[0].Value
	}
	user, err := h.scimService.CreateUser(c.Request().Context(), email, body.Name.GivenName, body.Name.FamilyName, "user")
	if err != nil {
		return c.JSON(http.StatusConflict, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	return c.JSON(http.StatusCreated, scimUser(*user))
}

func (h *SCIMHandler) UpdateUser(c echo.Context) error {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body struct {
		UserName string `json:"userName"`
		Name *struct {
			GivenName  *string `json:"givenName"`
			FamilyName *string `json:"familyName"`
		} `json:"name"`
		Emails []struct{ Value string `json:"value"` } `json:"emails"`
		Active *bool `json:"active"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Success: false, Message: "invalid body"})
	}
	var email *string
	if body.UserName != "" {
		email = &body.UserName
	} else if len(body.Emails) > 0 {
		email = &body.Emails[0].Value
	}
	var given, family *string
	if body.Name != nil {
		given = body.Name.GivenName
		family = body.Name.FamilyName
	}
	user, err := h.scimService.UpdateUser(c.Request().Context(), uint(id), email, given, family, body.Active)
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, scimUser(*user))
}

func (h *SCIMHandler) DeleteUser(c echo.Context) error {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.scimService.DeleteUser(c.Request().Context(), uint(id)); err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Success: false, Message: err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}
