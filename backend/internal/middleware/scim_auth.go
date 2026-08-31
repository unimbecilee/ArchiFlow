package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/labstack/echo/v4"
)

func SCIMAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token := os.Getenv("SCIM_TOKEN")
			if token == "" {
				return echo.NewHTTPError(http.StatusNotFound, "scim not configured")
			}
			auth := c.Request().Header.Get("Authorization")
			if !strings.HasPrefix(auth, "Bearer ") {
				return echo.NewHTTPError(http.StatusUnauthorized, "missing bearer token")
			}
			if strings.TrimPrefix(auth, "Bearer ") != token {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid token")
			}
			return next(c)
		}
	}
}
