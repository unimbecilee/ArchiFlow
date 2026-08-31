package middleware

import (
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const ContextKeyRequestID = "archiflow.request.id"

// RequestID garantit un identifiant de corrélation unique par requête :
// il réutilise X-Request-ID entrant s'il existe, sinon en génère un,
// le stocke dans le contexte Echo et le renvoie au client.
func RequestID() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			id := c.Request().Header.Get(echo.HeaderXRequestID)
			if id == "" {
				id = uuid.NewString()
				c.Request().Header.Set(echo.HeaderXRequestID, id)
			}
			c.Set(ContextKeyRequestID, id)
			c.Response().Header().Set(echo.HeaderXRequestID, id)
			return next(c)
		}
	}
}

// GetRequestID retourne l'identifiant de corrélation de la requête courante.
func GetRequestID(c echo.Context) string {
	if v, ok := c.Get(ContextKeyRequestID).(string); ok {
		return v
	}
	return ""
}
