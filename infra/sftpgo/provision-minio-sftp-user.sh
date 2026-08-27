#!/bin/sh
# Provision MinIO IAM-style credentials restricted to archiflow-sftp-inbox/*
# Usage (from host with mc alias to MinIO):
#   ./infra/sftpgo/provision-minio-sftp-user.sh
# Then set in .env:
#   MINIO_SFTP_ACCESS_KEY=sftpgo-inbox
#   MINIO_SFTP_SECRET_KEY=<printed secret>

set -eu

ALIAS="${MINIO_MC_ALIAS:-myminio}"
USER="${MINIO_SFTP_ACCESS_KEY:-sftpgo-inbox}"
BUCKET="${MINIO_SFTP_INBOX_BUCKET:-archiflow-sftp-inbox}"
# Credential material from env or openssl (no hardcoded value).
KEY_MATERIAL="${MINIO_SFTP_SECRET_KEY-}"

if [ -z "$KEY_MATERIAL" ]; then
  KEY_MATERIAL=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
fi

POLICY_NAME="archiflow-sftp-inbox-only"
POLICY_FILE=$(mktemp)
trap 'rm -f "$POLICY_FILE"' EXIT

cat > "$POLICY_FILE" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": ["arn:aws:s3:::${BUCKET}"],
      "Condition": {
        "StringLike": {
          "s3:prefix": ["users/*"]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::${BUCKET}/users/*"]
    }
  ]
}
EOF

mc admin policy create "$ALIAS" "$POLICY_NAME" "$POLICY_FILE" 2>/dev/null || \
  mc admin policy add "$ALIAS" "$POLICY_NAME" "$POLICY_FILE" 2>/dev/null || true

mc admin user add "$ALIAS" "$USER" "$KEY_MATERIAL" 2>/dev/null || true
mc admin policy attach "$ALIAS" "$POLICY_NAME" --user "$USER" 2>/dev/null || \
  mc admin policy set "$ALIAS" "$POLICY_NAME" user="$USER" 2>/dev/null || true

echo "MINIO_SFTP_ACCESS_KEY=${USER}"
echo "MINIO_SFTP_SECRET_KEY=${KEY_MATERIAL}"
echo "# Add these to .env — SFTPGo/auth will prefer them over root MinIO keys"
