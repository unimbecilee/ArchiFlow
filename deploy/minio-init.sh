#!/bin/sh
set -e

# Crée les buckets via l’API S3 (aws-cli). Endpoint = AWS_ENDPOINT_URL (compose).
aws --endpoint-url "${AWS_ENDPOINT_URL:-http://minio:9000}" s3 mb "s3://archiflow-documents" 2>/dev/null || true
aws --endpoint-url "${AWS_ENDPOINT_URL:-http://minio:9000}" s3 mb "s3://archives-requests" 2>/dev/null || true
aws --endpoint-url "${AWS_ENDPOINT_URL:-http://minio:9000}" s3 mb "s3://archiflow-sftp-inbox" 2>/dev/null || true

# Bucket CORS via API optionnel ; le serveur utilise MINIO_API_CORS_ALLOW_ORIGIN (docker-compose).
echo "MinIO buckets ready (API CORS from MINIO_API_CORS_ALLOW_ORIGIN)"
