package middleware

import (
	"github.com/labstack/echo/v4"
)

// SecurityHeaders adds baseline HTTP security headers for API + browser clients.
func SecurityHeaders() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			h := c.Response().Header()
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("X-Frame-Options", "DENY")
			h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
			h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
			h.Set("X-Permitted-Cross-Domain-Policies", "none")
			// API JSON — avoid caching auth responses on shared proxies
			if c.Path() != "" && c.Request().URL.Path != "" {
				h.Set("Cache-Control", "no-store")
			}
			return next(c)
		}
	}
}
