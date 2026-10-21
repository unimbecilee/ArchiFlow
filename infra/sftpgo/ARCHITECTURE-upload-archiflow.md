# Upload ArchiFlow — Browser → SFTPGo → MinIO (hot path)

## Flux

1. Navigateur `POST /api/upload/token` (session ArchiFlow) → JWT SFTPGo + chemins `/folders/{id}/…`
2. Navigateur `POST {SFTPGO_PUBLIC_URL}/api/v2/user/files/upload` + Bearer JWT (octets hors backend)
3. SFTPGo écrit MinIO `archiflow-documents` (`users/{ownerId}/…`)
4. Webhook `upload` → ingest Document + `folder_id` (pas de copy si déjà documents bucket)

## Infra

```bash
docker compose --profile sftp up -d
```

- SFTPGo :2022 / admin :8082
- Proxy Caddy CORS no-buffer :8088 (`deploy/Caddyfile.sftpgo`)
- Env : `SFTPGO_INTEGRATION_ENABLED=true`, `SFTPGO_PUBLIC_URL=http://localhost:8088`, `SFTPGO_USER_PASSWORD_SECRET`, `UPLOAD_SFTPGO_MAX_BYTES=0`
- Auth hook `POST /api/integrations/sftpgo/auth` requires `X-SFTPGO-Secret` (= `SFTPGO_WEBHOOK_SECRET`); compose sets `SFTPGO_HTTP__HEADERS__0_*`
- Filesystem credentials in auth response: prefer `MINIO_SFTP_*` (scoped). Root MinIO fallback only if `SFTPGO_ALLOW_ROOT_MINIO_CREDS=1` (non-prod)

## Smoke

```bash
# Après login UI, importer un fichier multi-Mo vers un dossier.
# Vérifier : Mes documents → fichier présent ; logs backend sans body upload.
curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  http://localhost:8088/api/v2/user/files/upload
```

Attendu : `204` CORS.
