package middleware

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type IdempotencyResponse struct {
	Code int
	Body []byte
}

const idempotencyHeader = "Idempotency-Key"
const idempotencyTTL = 24 * time.Hour

func Idempotency(db *gorm.DB) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			key := c.Request().Header.Get(idempotencyHeader)
			if key == "" {
				return next(c)
			}

			userID := getUserID(c)
			if userID == 0 {
				return next(c)
			}

			keyHash := sha256.Sum256([]byte(key + ":" + c.Path()))
			keyHashStr := hex.EncodeToString(keyHash[:])

			var stored IdempotencyResponse
			err := db.WithContext(c.Request().Context()).Raw(
				`SELECT response_code, response_body FROM idempotency_keys WHERE key_hash = ? AND expires_at > ?`,
				keyHashStr, time.Now(),
			).Scan(&stored).Error

			if err == nil {
				c.Response().Header().Set("X-Idempotency-Replayed", "true")
				c.Response().WriteHeader(stored.Code)
				_, _ = c.Response().Write(stored.Body)
				return nil
			}

			rec := &responseRecorder{ResponseWriter: c.Response().Writer, statusCode: http.StatusOK}
			c.Response().Writer = rec

			if err := next(c); err != nil {
				return err
			}

			if rec.statusCode >= 200 && rec.statusCode < 300 {
				body := rec.body.Bytes()
				_ = db.WithContext(c.Request().Context()).Exec(
					`INSERT INTO idempotency_keys (key_hash, user_id, route, response_code, response_body, expires_at)
					 VALUES (?, ?, ?, ?, ?, ?)
					 ON CONFLICT (key_hash) DO NOTHING`,
					keyHashStr, userID, c.Path(), rec.statusCode, body, time.Now().Add(idempotencyTTL),
				).Error
			}

			return nil
		}
	}
}

func getUserID(c echo.Context) uint {
	if v := c.Get("userID"); v != nil {
		if id, ok := v.(uint); ok {
			return id
		}
	}
	return 0
}

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
	body       *bytesBuffer
}

type bytesBuffer struct {
	data []byte
}

func (b *bytesBuffer) Write(p []byte) (int, error) {
	b.data = append(b.data, p...)
	return len(p), nil
}

func (b *bytesBuffer) Bytes() []byte {
	return b.data
}

func (r *responseRecorder) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *responseRecorder) Write(p []byte) (int, error) {
	r.body.Write(p)
	return r.ResponseWriter.Write(p)
}