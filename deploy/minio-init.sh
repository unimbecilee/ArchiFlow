#!/bin/sh
set -e

MC_USER="${MINIO_ROOT_USER:-minioadmin}"
MC_PASS="${MINIO_ROOT_PASSWORD:-minioadmin123}"

mc alias set myminio http://minio:9000 "$MC_USER" "$MC_PASS"
mc mb myminio/archiflow-documents --ignore-existing
mc mb myminio/archives-requests --ignore-existing
mc mb myminio/archiflow-sftp-inbox --ignore-existing

# Bucket CORS via mc is optional; MinIO server uses MINIO_API_CORS_ALLOW_ORIGIN (see docker-compose).
echo "MinIO buckets ready (API CORS from MINIO_API_CORS_ALLOW_ORIGIN)"
