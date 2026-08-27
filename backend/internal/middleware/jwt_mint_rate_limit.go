package middleware

import (
	"fmt"
	"time"

	"github.com/labstack/echo/v4"
)

// SftpGoJWTMintRateLimit rate-limits minting of short-lived SFTPGo JWTs (per user + IP).
// File type / size enforcement is in services.ValidateMultipartFile (MAX_CONTENT_LENGTH).
func SftpGoJWTMintRateLimit() echo.MiddlewareFunc {
	perHour := envInt("SFTPGO_JWT_MINT_RATE_LIMIT_PER_HOUR", 200)
	burst := envInt("SFTPGO_JWT_MINT_RATE_LIMIT_BURST", 50)
	if perHour < 1 {
		perHour = 200
	}
	if burst < 1 {
		burst = 50
	}
	perMinute := perHour / 60
	if perMinute < 1 {
		perMinute = 1
	}
	store := rateLimitStore(perMinute, burst, time.Hour)
	return rateLimitMiddleware(store, func(c echo.Context) (string, error) {
		uid, _ := c.Get("userID").(uint)
		return fmt.Sprintf("sftpgo-jwt-mint:%s:%d", c.RealIP(), uid), nil
	})
}
