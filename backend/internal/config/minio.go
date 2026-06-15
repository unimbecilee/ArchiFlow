package config

import (
	"context"
	"fmt"
	"log"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var MinioClient *minio.Client

func InitMinio(endpoint, accessKey, secretKey string, useSSL bool) (*minio.Client, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create minio client: %w", err)
	}

	// Test connection
	ctx := context.Background()
	buckets, err := client.ListBuckets(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to minio: %w", err)
	}

	MinioClient = client
	log.Printf("✅ MinIO connected successfully. Found %d buckets", len(buckets))
	return client, nil
}

func EnsureBucket(bucketName string) error {
	ctx := context.Background()
	exists, err := MinioClient.BucketExists(ctx, bucketName)
	if err != nil {
		return err
	}
	if !exists {
		err = MinioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			return err
		}
		log.Printf("✅ Created bucket: %s", bucketName)
	}
	return nil
}
