package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"os"
	"strings"

	"archiflow/backend/internal/config"

	"github.com/labstack/echo/v4"
)

// PydioAPIAuth vérifie X-Pydio-Token ou X-Pydio-Signature pour les appels Cells → ArchiFlow.
// PYDIO_DEV_INSECURE=1 désactive l'auth (dev uniquement) — voir SecurityWarnings() au démarrage.
func PydioAPIAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if config.PydioDevInsecure() {
				return next(c)
			}

			token := c.Request().Header.Get("X-Pydio-Token")
			expected := strings.TrimSpace(os.Getenv("PYDIO_API_TOKEN"))
			if expected == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "PYDIO_API_TOKEN not configured")
			}
			if token != "" && token == expected {
				return next(c)
			}

			sig := c.Request().Header.Get("X-Pydio-Signature")
			if sig != "" {
				secret := strings.TrimSpace(os.Getenv("PYDIO_WEBHOOK_SECRET"))
				if secret == "" {
					return echo.NewHTTPError(http.StatusUnauthorized, "PYDIO_WEBHOOK_SECRET not configured")
				}
				body, err := readBodyPreserve(c)
				if err != nil {
					return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
				}
				mac := hmac.New(sha256.New, []byte(secret))
				mac.Write(body)
				expectedSig := hex.EncodeToString(mac.Sum(nil))
				if hmac.Equal([]byte(sig), []byte(expectedSig)) {
					return next(c)
				}
			}

			return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or missing Pydio authentication")
		}
	}
}
