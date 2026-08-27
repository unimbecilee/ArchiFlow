package middleware

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

// isUploadMPUControlRoute matches MPU session status, presign, complete, abort (not session init).
func isUploadMPUControlRoute(c echo.Context) bool {
	p := c.Path()
	if !strings.Contains(p, "/upload/sessions/") {
		return false
	}
	return strings.Contains(p, "/upload/sessions/:id")
}

func rateLimitStore(perMinute, burst int, expires time.Duration) *middleware.RateLimiterMemoryStore {
	if perMinute < 1 {
		perMinute = 60
	}
	if burst < 1 {
		burst = 10
	}
	if expires < time.Minute {
		expires = 3 * time.Minute
	}
	return middleware.NewRateLimiterMemoryStoreWithConfig(
		middleware.RateLimiterMemoryStoreConfig{
			Rate:      rate.Every(time.Minute / time.Duration(perMinute)),
			Burst:     burst,
			ExpiresIn: expires,
		},
	)
}

func rateLimitMiddleware(store *middleware.RateLimiterMemoryStore, idFn func(echo.Context) (string, error)) echo.MiddlewareFunc {
	return rateLimitMiddlewareWithSkipper(store, idFn, nil)
}

func rateLimitMiddlewareWithSkipper(
	store *middleware.RateLimiterMemoryStore,
	idFn func(echo.Context) (string, error),
	skipper func(echo.Context) bool,
) echo.MiddlewareFunc {
	return middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store:               store,
		IdentifierExtractor: idFn,
		Skipper:             skipper,
		ErrorHandler: func(c echo.Context, err error) error {
			return c.JSON(429, map[string]any{
				"success": false,
				"message": "too many requests, try again later",
			})
		},
	})
}

func envInt(key string, def int) int {
	if raw := os.Getenv(key); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			return n
		}
	}
	return def
}

// AuthRateLimit limits brute-force on login/register/refresh (per IP).
func AuthRateLimit() echo.MiddlewareFunc {
	perMinute := envInt("AUTH_RATE_LIMIT_PER_MINUTE", 10)
	burst := envInt("AUTH_RATE_LIMIT_BURST", 5)
	expires := time.Duration(envInt("AUTH_RATE_LIMIT_EXPIRES_SECONDS", 180)) * time.Second
	store := rateLimitStore(perMinute, burst, expires)
	return rateLimitMiddleware(store, func(c echo.Context) (string, error) {
		return c.RealIP(), nil
	})
}

// ProtectedRateLimit applies to all authenticated API routes (per IP + user).
func ProtectedRateLimit() echo.MiddlewareFunc {
	perMinute := envInt("PROTECTED_RATE_LIMIT_PER_MINUTE", 120)
	burst := envInt("PROTECTED_RATE_LIMIT_BURST", 40)
	store := rateLimitStore(perMinute, burst, 3*time.Minute)
	return rateLimitMiddlewareWithSkipper(store, func(c echo.Context) (string, error) {
		uid, _ := c.Get("userID").(uint)
		return fmt.Sprintf("%s:%d", c.RealIP(), uid), nil
	}, func(c echo.Context) bool {
		return isUploadMPUControlRoute(c)
	})
}

// UploadRateLimit stricter cap on multipart uploads (per user + IP).
func UploadRateLimit() echo.MiddlewareFunc {
	perMinute := envInt("UPLOAD_RATE_LIMIT_PER_MINUTE", 20)
	store := rateLimitStore(perMinute, 5, 3*time.Minute)
	return rateLimitMiddleware(store, func(c echo.Context) (string, error) {
		uid, _ := c.Get("userID").(uint)
		return fmt.Sprintf("upload:%s:%d", c.RealIP(), uid), nil
	})
}

// PydioAPIRateLimit limits abuse on Cells → ArchiFlow bridge (per IP).
func PydioAPIRateLimit() echo.MiddlewareFunc {
	perMinute := envInt("PYDIO_API_RATE_LIMIT_PER_MINUTE", 60)
	store := rateLimitStore(perMinute, 15, 3*time.Minute)
	return rateLimitMiddleware(store, func(c echo.Context) (string, error) {
		return "pydio:" + c.RealIP(), nil
	})
}

// APIRateLimit kept for backward compatibility (search-heavy routes).
func APIRateLimit() echo.MiddlewareFunc {
	perMinute := envInt("API_RATE_LIMIT_PER_MINUTE", 60)
	store := rateLimitStore(perMinute, 20, 3*time.Minute)
	return rateLimitMiddleware(store, func(c echo.Context) (string, error) {
		return c.RealIP(), nil
	})
}

// UploadInitRateLimit limits MPU session creation (per user + IP).
func UploadInitRateLimit() echo.MiddlewareFunc {
	perHour := envInt("UPLOAD_INIT_RATE_LIMIT_PER_HOUR", 200)
	burst := envInt("UPLOAD_INIT_RATE_LIMIT_BURST", 50)
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
		return fmt.Sprintf("upload-init:%s:%d", c.RealIP(), uid), nil
	})
}

// UploadMPUControlRateLimit covers presign/status/complete/abort for large MPU uploads (per user + IP).
func UploadMPUControlRateLimit() echo.MiddlewareFunc {
	perHour := envInt("UPLOAD_MPU_RATE_LIMIT_PER_HOUR", 12000)
	burst := envInt("UPLOAD_MPU_RATE_LIMIT_BURST", 500)
	if perHour < 1 {
		perHour = 12000
	}
	if burst < 1 {
		burst = 500
	}
	perMinute := perHour / 60
	if perMinute < 1 {
		perMinute = 1
	}
	store := rateLimitStore(perMinute, burst, time.Hour)
	return rateLimitMiddleware(store, func(c echo.Context) (string, error) {
		uid, _ := c.Get("userID").(uint)
		return fmt.Sprintf("upload-mpu:%s:%d", c.RealIP(), uid), nil
	})
}
