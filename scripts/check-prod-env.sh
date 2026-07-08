#!/usr/bin/env bash
# Pre-deploy production env validation (run before go run / docker up with ENVIRONMENT=production).
set -euo pipefail

cd "$(dirname "$0")/../backend"
export ENVIRONMENT="${ENVIRONMENT:-production}"

go test ./internal/config/ -run TestValidateSecurityForEnvProduction -count=1

echo "[check-prod-env] OK — production security env rules satisfied"
