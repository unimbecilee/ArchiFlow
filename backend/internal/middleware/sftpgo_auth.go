package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"strings"

	"archiflow/backend/internal/config"

	"github.com/labstack/echo/v4"
)

// SftpGoWebhookAuth vérifie X-SFTPGO-Secret (HMAC hex du body ou secret partagé).
func SftpGoWebhookAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			secret := strings.TrimSpace(os.Getenv("SFTPGO_WEBHOOK_SECRET"))
			if secret == "" {
				if config.IsProduction() {
					return echo.NewHTTPError(http.StatusUnauthorized, "SFTPGO_WEBHOOK_SECRET not configured")
				}
				secret = "archiflow_sftpgo_webhook_secret_2024"
			}

			provided := c.Request().Header.Get("X-SFTPGO-Secret")
			if provided == "" {
				provided = c.Request().Header.Get("X-Sftpgo-Secret")
			}

			body, err := io.ReadAll(io.LimitReader(c.Request().Body, 1<<20))
			if err != nil {
				return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
			}
			c.Request().Body = io.NopCloser(bytes.NewReader(body))

			// Accept plain shared secret OR HMAC-SHA256(body)
			if provided == secret {
				return next(c)
			}
			mac := hmac.New(sha256.New, []byte(secret))
			mac.Write(body)
			expected := hex.EncodeToString(mac.Sum(nil))
			if hmac.Equal([]byte(strings.ToLower(provided)), []byte(expected)) {
				return next(c)
			}
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid sftpgo webhook secret")
		}
	}
}
