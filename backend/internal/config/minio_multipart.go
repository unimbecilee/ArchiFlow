package config

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// minioPresignClient signs URLs for the browser-facing host (no host rewrite).
var minioPresignClient *minio.Client

// InitMinioPublicURL configures a presign-only client targeting MINIO_PUBLIC_ENDPOINT.
// Region is fixed so Presign does not call GetBucketLocation (avoids localhost from inside Docker).
func InitMinioPublicURL(endpoint string, useSSL bool, accessKey, secretKey string) error {
	minioPresignClient = nil
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		minioPresignClient = MinioClient
		return nil
	}
	host := endpoint
	if strings.HasPrefix(endpoint, "http://") || strings.HasPrefix(endpoint, "https://") {
		u, err := url.Parse(endpoint)
		if err != nil || u.Host == "" {
			return fmt.Errorf("invalid MINIO_PUBLIC_ENDPOINT: %s", endpoint)
		}
		host = u.Host
		if u.Scheme == "https" {
			useSSL = true
		}
	}
	client, err := minio.New(host, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
		Region: "us-east-1",
	})
	if err != nil {
		return fmt.Errorf("minio presign client: %w", err)
	}
	minioPresignClient = client
	return nil
}

func presignClient() *minio.Client {
	if minioPresignClient != nil {
		return minioPresignClient
	}
	return MinioClient
}

func minioCore() (*minio.Core, error) {
	if MinioClient == nil {
		return nil, fmt.Errorf("minio client not initialized")
	}
	return &minio.Core{Client: MinioClient}, nil
}

// DefaultMultipartPartSize is the recommended chunk size for large uploads (64 MiB).
const DefaultMultipartPartSize = 64 << 20

// MinMultipartPartSize is the S3 minimum part size (5 MiB except last part).
const MinMultipartPartSize = 5 << 20

// PresignedPartURLTTL duration for presigned MPU part PUT URLs.
func PresignedPartURLTTL() time.Duration {
	if raw := strings.TrimSpace(os.Getenv("PRESIGNED_PART_URL_TTL_MINUTES")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			return time.Duration(n) * time.Minute
		}
	}
	return 15 * time.Minute
}

// MaxResumableUploadBytes returns the per-file ceiling for resumable uploads (default 50 GiB).
func MaxResumableUploadBytes() int64 {
	if raw := strings.TrimSpace(os.Getenv("MAX_UPLOAD_FILE_GB")); raw != "" {
		if n, err := strconv.ParseInt(raw, 10, 64); err == nil && n > 0 {
			return n * (1 << 30)
		}
	}
	return 50 * (1 << 30)
}

// PartSizeForFile picks MPU part size based on file size and env overrides.
func PartSizeForFile(fileSize int64) int64 {
	if raw := strings.TrimSpace(os.Getenv("UPLOAD_PART_SIZE_BYTES")); raw != "" {
		if n, err := strconv.ParseInt(raw, 10, 64); err == nil && n >= MinMultipartPartSize {
			return n
		}
	}
	if fileSize > 0 && fileSize < 1<<30 {
		return 32 << 20
	}
	return DefaultMultipartPartSize
}

// TotalParts returns how many MPU parts are needed for a file.
func TotalParts(fileSize, partSize int64) int {
	if partSize <= 0 {
		partSize = DefaultMultipartPartSize
	}
	if fileSize <= 0 {
		return 1
	}
	n := int((fileSize + partSize - 1) / partSize)
	if n < 1 {
		return 1
	}
	return n
}

// NewMultipartUpload starts an S3 multipart upload in MinIO.
func NewMultipartUpload(ctx context.Context, bucket, objectKey, contentType string) (string, error) {
	core, err := minioCore()
	if err != nil {
		return "", err
	}
	if err := EnsureBucket(bucket); err != nil {
		return "", err
	}
	opts := minio.PutObjectOptions{ContentType: contentType}
	return core.NewMultipartUpload(ctx, bucket, objectKey, opts)
}

// PresignUploadPart returns a presigned PUT URL signed for the browser-facing MinIO host.
func PresignUploadPart(ctx context.Context, bucket, objectKey, uploadID string, partNumber int) (string, error) {
	client := presignClient()
	if client == nil {
		return "", fmt.Errorf("minio presign client not initialized")
	}
	reqParams := make(url.Values)
	reqParams.Set("uploadId", uploadID)
	reqParams.Set("partNumber", strconv.Itoa(partNumber))
	u, err := client.Presign(ctx, http.MethodPut, bucket, objectKey, PresignedPartURLTTL(), reqParams)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}

// CompleteMultipartUpload finalizes MPU and returns object info.
func CompleteMultipartUpload(ctx context.Context, bucket, objectKey, uploadID string, parts []minio.CompletePart) (minio.UploadInfo, error) {
	core, err := minioCore()
	if err != nil {
		return minio.UploadInfo{}, err
	}
	return core.CompleteMultipartUpload(ctx, bucket, objectKey, uploadID, parts, minio.PutObjectOptions{})
}

// AbortMultipartUpload cancels an in-progress MPU.
func AbortMultipartUpload(ctx context.Context, bucket, objectKey, uploadID string) error {
	core, err := minioCore()
	if err != nil {
		return err
	}
	return core.AbortMultipartUpload(ctx, bucket, objectKey, uploadID)
}

// ListUploadedParts returns parts already stored in MinIO for an MPU session.
func ListUploadedParts(ctx context.Context, bucket, objectKey, uploadID string) ([]minio.ObjectPart, error) {
	core, err := minioCore()
	if err != nil {
		return nil, err
	}
	var all []minio.ObjectPart
	marker := 0
	for {
		res, err := core.ListObjectParts(ctx, bucket, objectKey, uploadID, marker, 1000)
		if err != nil {
			return nil, err
		}
		all = append(all, res.ObjectParts...)
		if !res.IsTruncated {
			break
		}
		marker = res.NextPartNumberMarker
	}
	return all, nil
}
