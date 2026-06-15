package handlers

import (
	"net/http"
	"strconv"

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
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.fav.Add(userID, uint(id), roleFromContext(c)); err != nil {
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
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	_ = h.fav.Remove(userID, uint(id))
	return c.JSON(http.StatusOK, map[string]any{"success": true, "favorited": false})
}

// Status GET /api/documents/:id/favorite
func (h *FavoriteHandler) Status(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	ok, _ := h.fav.IsFavorite(userID, uint(id))
	return c.JSON(http.StatusOK, map[string]any{"success": true, "favorited": ok})
}
