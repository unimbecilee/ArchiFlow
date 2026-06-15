package config

import (
	"context"
	"fmt"
	"io"
	"path"
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
	u, err := MinioClient.PresignedGetObject(ctx, bucket, objectName, 24*time.Hour, nil)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}
