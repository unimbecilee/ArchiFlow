#!/bin/sh
# Smoke CORS + SFTPGo proxy health (profile sftp).
set -e
echo "OPTIONS CORS check..."
code=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" \
  http://localhost:8088/api/v2/user/files/upload || echo "000")
echo "CORS preflight HTTP $code"
test "$code" = "204" -o "$code" = "200" && echo "OK cors" || echo "WARN cors (is profile sftp up?)"
echo "SFTPGo admin UI :8082 — upload proxy :8088 — token API POST /api/upload/token"
