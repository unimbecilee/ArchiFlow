package services

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/repository"

	"github.com/redis/go-redis/v9"
)

// UploadQuotaService enforces storage and concurrent upload limits.
type UploadQuotaService struct {
	docRepo    *repository.DocumentRepository
	uploadRepo *repository.UploadRepository
	rdb        *redis.Client
	memLocks   sync.Map // fallback when Redis unavailable: sha256 -> expiry
}

func NewUploadQuotaService(
	docRepo *repository.DocumentRepository,
	uploadRepo *repository.UploadRepository,
) *UploadQuotaService {
	return &UploadQuotaService{
		docRepo:    docRepo,
		uploadRepo: uploadRepo,
		rdb:        config.RedisClient(),
	}
}

func maxStorageBytesPerUser() int64 {
	if raw := strings.TrimSpace(os.Getenv("MAX_STORAGE_BYTES")); raw != "" {
		if n, err := strconv.ParseInt(raw, 10, 64); err == nil && n > 0 {
			return n
		}
	}
	return 500 * (1 << 30) // 500 GiB default
}

func maxConcurrentUploads() int64 {
	if raw := strings.TrimSpace(os.Getenv("MAX_CONCURRENT_UPLOADS")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			return int64(n)
		}
	}
	return 10
}

// CheckStorage verifies the user can store additional bytes (documents + reserved uploads).
func (q *UploadQuotaService) CheckStorage(ctx context.Context, userID uint, additionalBytes int64) error {
	if userID == 0 || additionalBytes <= 0 {
		return nil
	}
	used, err := q.docRepo.SumSizeByOwner(userID)
	if err != nil {
		return err
	}
	pending, err := q.uploadRepo.SumActiveBytesByUser(userID)
	if err != nil {
		return err
	}
	max := maxStorageBytesPerUser()
	if used+pending+additionalBytes > max {
		return fmt.Errorf("quota stockage depasse (max %d Go)", max/(1<<30))
	}
	return nil
}

// CheckConcurrent verifies active upload session count.
func (q *UploadQuotaService) CheckConcurrent(ctx context.Context, userID uint) error {
	n, err := q.uploadRepo.CountActiveByUser(userID)
	if err != nil {
		return err
	}
	if n >= maxConcurrentUploads() {
		return fmt.Errorf("trop d'uploads simultanes (max %d)", maxConcurrentUploads())
	}
	return nil
}

func uploadLockKey(userID uint, sha256 string) string {
	sha := strings.TrimSpace(sha256)
	if sha == "" {
		sha = "none"
	}
	return fmt.Sprintf("upload:lock:%d:%s", userID, sha)
}

// TryAcquireUploadLock prevents duplicate in-flight uploads for the same file hash.
func (q *UploadQuotaService) TryAcquireUploadLock(ctx context.Context, userID uint, sha256 string) (bool, error) {
	key := uploadLockKey(userID, sha256)
	ttl := 7 * 24 * time.Hour
	if q.rdb != nil {
		ok, err := q.rdb.SetNX(ctx, key, "1", ttl).Result()
		return ok, err
	}
	now := time.Now()
	if v, loaded := q.memLocks.LoadOrStore(key, now.Add(ttl)); loaded {
		if exp, ok := v.(time.Time); ok && exp.After(now) {
			return false, nil
		}
		q.memLocks.Store(key, now.Add(ttl))
	}
	return true, nil
}

// ReleaseUploadLock frees the idempotence lock after complete/abort.
func (q *UploadQuotaService) ReleaseUploadLock(ctx context.Context, userID uint, sha256 string) {
	key := uploadLockKey(userID, sha256)
	if q.rdb != nil {
		_ = q.rdb.Del(ctx, key).Err()
		return
	}
	q.memLocks.Delete(key)
}
