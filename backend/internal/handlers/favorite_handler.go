package handlers

import (
	"net/http"

	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type FavoriteHandler struct {
	fav *services.FavoriteService
	doc *DocumentHandler
}

func NewFavoriteHandler(fav *services.FavoriteService, doc *DocumentHandler) *FavoriteHandler {
	return &FavoriteHandler{fav: fav, doc: doc}
}

// List GET /api/favorites
func (h *FavoriteHandler) List(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	docs, err := h.fav.List(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success":   true,
		"documents": h.doc.documentsJSON(docs),
		"total":     len(docs),
	})
}

// Add POST /api/documents/:id/favorite
func (h *FavoriteHandler) Add(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if err := h.fav.Add(userID, id, roleFromContext(c)); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "favorited": true})
}

// Remove DELETE /api/documents/:id/favorite
func (h *FavoriteHandler) Remove(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	_ = h.fav.Remove(userID, id)
	return c.JSON(http.StatusOK, map[string]any{"success": true, "favorited": false})
}

// Status GET /api/documents/:id/favorite
func (h *FavoriteHandler) Status(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	ok, _ := h.fav.IsFavorite(userID, id)
	return c.JSON(http.StatusOK, map[string]any{"success": true, "favorited": ok})
}
