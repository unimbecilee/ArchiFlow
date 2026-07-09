package config

import (
	"context"
	"fmt"
	"io"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"archiflow/backend/internal/utils"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
)

// UploadObject envoie un fichier vers MinIO et retourne le chemin objet.
func UploadObject(ctx context.Context, bucket, objectName string, reader io.Reader, size int64, contentType string) (string, error) {
	if MinioClient == nil {
		return "", fmt.Errorf("minio client not initialized")
	}
	if err := EnsureBucket(bucket); err != nil {
		return "", err
	}
	_, err := MinioClient.PutObject(ctx, bucket, objectName, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("upload failed: %w", err)
	}
	return path.Join(bucket, objectName), nil
}

// NewArchiveObjectName génère un nom unique pour un fichier d'archive.
func NewArchiveObjectName(original string) string {
	ext := utils.SafeFileExt(original)
	// Reject path traversal in original name (ext already sanitized)
	if strings.Contains(original, "..") || strings.ContainsAny(original, `/\`) {
		ext = ""
	}
	return uuid.New().String() + ext
}

// GetObjectStream lit un objet MinIO.
func GetObjectStream(ctx context.Context, bucket, objectName string) (*minio.Object, error) {
	if MinioClient == nil {
		return nil, fmt.Errorf("minio client not initialized")
	}
	return MinioClient.GetObject(ctx, bucket, objectName, minio.GetObjectOptions{})
}

// PresignedGetURL URL temporaire de lecture (optionnel).
func PresignedGetURL(ctx context.Context, bucket, objectName string) (string, error) {
	if MinioClient == nil {
		return "", fmt.Errorf("minio client not initialized")
	}
	ttl := presignedURLTTL()
	u, err := MinioClient.PresignedGetObject(ctx, bucket, objectName, ttl, nil)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}

func presignedURLTTL() time.Duration {
	if raw := strings.TrimSpace(os.Getenv("PRESIGNED_URL_TTL_MINUTES")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			return time.Duration(n) * time.Minute
		}
	}
	if strings.EqualFold(strings.TrimSpace(os.Getenv("ENVIRONMENT")), "production") {
		return 15 * time.Minute
	}
	return 60 * time.Minute
}

// CopyObject copie un objet MinIO (staging → canonique).
func CopyObject(ctx context.Context, srcBucket, srcKey, dstBucket, dstKey string) error {
	if MinioClient == nil {
		return fmt.Errorf("minio client not initialized")
	}
	if err := EnsureBucket(dstBucket); err != nil {
		return err
	}
	src := minio.CopySrcOptions{Bucket: srcBucket, Object: srcKey}
	dst := minio.CopyDestOptions{Bucket: dstBucket, Object: dstKey}
	_, err := MinioClient.CopyObject(ctx, dst, src)
	return err
}

// StatObject retourne la taille d'un objet MinIO.
func StatObject(ctx context.Context, bucket, objectName string) (int64, string, error) {
	if MinioClient == nil {
		return 0, "", fmt.Errorf("minio client not initialized")
	}
	info, err := MinioClient.StatObject(ctx, bucket, objectName, minio.StatObjectOptions{})
	if err != nil {
		return 0, "", err
	}
	return info.Size, info.ContentType, nil
}

// SFTPInboxBucket retourne le bucket staging SFTP.
func SFTPInboxBucket() string {
	if v := strings.TrimSpace(os.Getenv("MINIO_SFTP_INBOX_BUCKET")); v != "" {
		return v
	}
	return "archiflow-sftp-inbox"
}
