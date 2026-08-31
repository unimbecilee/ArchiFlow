package handlers

import (
	"context"
	"net/http"
	"os"
	"strings"
	"time"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db      *gorm.DB
	bucket  string
	minimal bool
}

func NewHealthHandler(db *gorm.DB, documentsBucket string) *HealthHandler {
	return &HealthHandler{db: db, bucket: documentsBucket, minimal: documentsBucket == ""}
}

func (h *HealthHandler) Liveness(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]any{
		"status":         "healthy",
		"upload_metrics": services.UploadMetricsSnapshot(),
	})
}

func (h *HealthHandler) Ready(c echo.Context) error {
	ctx, cancel := context.WithTimeout(c.Request().Context(), 4*time.Second)
	defer cancel()

	checks := make(map[string]string)
	ready := true

	checks["postgres"] = h.checkPostgres(ctx)
	if checks["postgres"] != "ok" {
		ready = false
	}
	checks["redis"] = h.checkRedis(ctx)
	if strings.HasPrefix(checks["redis"], "ko") {
		ready = false
	}
	checks["minio"] = h.checkMinio(ctx)
	if !strings.HasPrefix(checks["minio"], "ok") {
		ready = false
	}

	resp := map[string]any{"checks": checks}
	if ready {
		resp["status"] = "ready"
		return c.JSON(http.StatusOK, resp)
	}
	resp["status"] = "not_ready"
	return c.JSON(http.StatusServiceUnavailable, resp)
}

func (h *HealthHandler) checkPostgres(ctx context.Context) string {
	if h.db == nil {
		return "ko (base absente)"
	}
	sqlDB, err := h.db.DB()
	if err != nil {
		return "ko (" + err.Error() + ")"
	}
	if err := sqlDB.PingContext(ctx); err != nil {
		return "ko (" + err.Error() + ")"
	}
	return "ok"
}

func (h *HealthHandler) checkRedis(ctx context.Context) string {
	if os.Getenv("REDIS_URL") == "" {
		return "ok (non configuré)"
	}
	client := config.RedisClient()
	if client == nil {
		if initErr := config.RedisInitError(); initErr != nil {
			return "ko (" + initErr.Error() + ")"
		}
		return "ko (indisponible)"
	}
	if err := client.Ping(ctx).Err(); err != nil {
		return "ko (" + err.Error() + ")"
	}
	return "ok"
}

func (h *HealthHandler) checkMinio(ctx context.Context) string {
	if h.minimal {
		return "ok (stockage non configuré)"
	}
	if config.MinioClient == nil {
		return "ko (client absent)"
	}
	ok, err := config.MinioClient.BucketExists(ctx, h.bucket)
	if err != nil {
		return "ko (" + err.Error() + ")"
	}
	if !ok {
		return "ko (bucket absent : " + h.bucket + ")"
	}
	return "ok"
}
