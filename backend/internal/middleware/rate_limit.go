package middleware

import (
	"os"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

// AuthRateLimit limits brute-force on login/register/refresh (per IP).
func AuthRateLimit() echo.MiddlewareFunc {
	perMinute := 10
	if raw := os.Getenv("AUTH_RATE_LIMIT_PER_MINUTE"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			perMinute = n
		}
	}
	burst := 5
	if raw := os.Getenv("AUTH_RATE_LIMIT_BURST"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			burst = n
		}
	}
	expires := 3 * time.Minute
	if raw := os.Getenv("AUTH_RATE_LIMIT_EXPIRES_SECONDS"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			expires = time.Duration(n) * time.Second
		}
	}
	store := middleware.NewRateLimiterMemoryStoreWithConfig(
		middleware.RateLimiterMemoryStoreConfig{
			Rate:      rate.Every(time.Minute / time.Duration(perMinute)),
			Burst:     burst,
			ExpiresIn: expires,
		},
	)
	return middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: store,
		IdentifierExtractor: func(c echo.Context) (string, error) {
			return c.RealIP(), nil
		},
		ErrorHandler: func(c echo.Context, err error) error {
			return c.JSON(429, map[string]any{
				"success": false,
				"message": "too many requests, try again later",
			})
		},
	})
}
