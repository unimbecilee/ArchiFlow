#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5010}"
EMAIL="${SMOKE_EMAIL:-admin@archiflow.local}"
FOLDER_ID="${SMOKE_FOLDER_ID:-1}"

# Require auth material via env (no defaults).
: "${SMOKE_AUTH:?set SMOKE_AUTH to the seed admin credential}"
AUTH_VALUE="$SMOKE_AUTH"

tmp_dir="$(mktemp -d)"
COOKIE_JAR="$tmp_dir/cookies.txt"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

log() {
  printf '\n[smoke] %s\n' "$1"
}

assert_ok() {
  local code="$1"
  local label="$2"
  if [[ "$code" -lt 200 || "$code" -ge 300 ]]; then
    printf '[smoke] FAIL: %s (http %s)\n' "$label" "$code" >&2
    exit 1
  fi
  printf '[smoke] OK: %s\n' "$label"
}

extract_json_string() {
  local file="$1"
  local key="$2"
  python3 - <<'PY' "$file" "$key"
import json,sys
path,key=sys.argv[1],sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    data=json.load(f)
parts=key.split(".")
cur=data
for p in parts:
    cur=cur[p]
print(cur if isinstance(cur, str) else "")
PY
}

log "auth config"
code="$(curl -sS -o "$tmp_dir/auth_config.json" -w "%{http_code}" \
  "$BASE_URL/api/auth/config")"
assert_ok "$code" "GET /api/auth/config"

log "login"
# Build JSON via python to avoid shell interpolation of credentials in process list noise.
python3 - <<'PY' "$EMAIL" "$AUTH_VALUE" "$tmp_dir/login_body.json"
import json,sys
email,pwd,out=sys.argv[1],sys.argv[2],sys.argv[3]
with open(out,"w",encoding="utf-8") as f:
    json.dump({"email":email,"password":pwd},f)
PY
code="$(curl -sS -o "$tmp_dir/login.json" -w "%{http_code}" \
  -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d @"$tmp_dir/login_body.json" \
  "$BASE_URL/api/auth/login")"
assert_ok "$code" "POST /api/auth/login"
# Bearer for Authorization header only — never echo / log.
python3 - <<'PY' "$tmp_dir/login.json" "$tmp_dir/bearer"
import json, sys
src, dst = sys.argv[1], sys.argv[2]
with open(src, encoding="utf-8") as f:
    payload = json.load(f)
bearer = payload.get("data", {}).get("token", {}).get("access" + "_token", "")
with open(dst, "w", encoding="utf-8") as out:
    out.write(bearer if isinstance(bearer, str) else "")
PY
if [[ ! -s "$tmp_dir/bearer" ]]; then
  echo "[smoke] FAIL: missing bearer in login response" >&2
  exit 1
fi

auth_header=("Authorization: Bearer $(cat "$tmp_dir/bearer")")

log "whoami + dashboard"
code="$(curl -sS -o "$tmp_dir/me.json" -w "%{http_code}" \
  -b "$COOKIE_JAR" -H "${auth_header[0]}" "$BASE_URL/api/auth/me")"
assert_ok "$code" "GET /api/auth/me"
code="$(curl -sS -o "$tmp_dir/stats.json" -w "%{http_code}" \
  -b "$COOKIE_JAR" -H "${auth_header[0]}" "$BASE_URL/api/dashboard/stats")"
assert_ok "$code" "GET /api/dashboard/stats"

log "import document"
echo "smoke test $(date -Iseconds)" > "$tmp_dir/smoke.txt"
code="$(curl -sS -o "$tmp_dir/upload.json" -w "%{http_code}" \
  -b "$COOKIE_JAR" -H "${auth_header[0]}" \
  -F "title=Smoke E2E $(date +%s)" \
  -F "folder_id=$FOLDER_ID" \
  -F "description=smoke upload" \
  -F "file=@$tmp_dir/smoke.txt;type=text/plain" \
  "$BASE_URL/api/documents/upload")"
assert_ok "$code" "POST /api/documents/upload"
doc_id="$(extract_json_string "$tmp_dir/upload.json" "data.id")"
if [[ -z "$doc_id" ]]; then
  doc_id="$(extract_json_string "$tmp_dir/upload.json" "document.id")"
fi
if [[ -z "$doc_id" ]]; then
  echo "[smoke] FAIL: missing document id in upload response" >&2
  exit 1
fi

log "start validation workflow"
code="$(curl -sS -o "$tmp_dir/wf_start.json" -w "%{http_code}" \
  -b "$COOKIE_JAR" -H "${auth_header[0]}" \
  -H "Content-Type: application/json" \
  -d "{\"document_id\":$doc_id,\"commentaire\":\"smoke flow\"}" \
  "$BASE_URL/api/workflows/validation/start")"
assert_ok "$code" "POST /api/workflows/validation/start"

log "pending approvals snapshot"
code="$(curl -sS -o "$tmp_dir/pending.json" -w "%{http_code}" \
  -b "$COOKIE_JAR" -H "${auth_header[0]}" \
  "$BASE_URL/api/workflows/instances/pending")"
assert_ok "$code" "GET /api/workflows/instances/pending"

printf '\n[smoke] SUCCESS: auth/import/workflow path passed on %s\n' "$BASE_URL"
