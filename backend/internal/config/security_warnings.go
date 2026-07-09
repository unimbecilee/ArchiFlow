package config

import (
	"fmt"
	"os"
	"strings"
)

// SecurityWarnings returns non-fatal security notices for logs (dev/staging).
func SecurityWarnings() []string {
	var out []string
	if PydioDevInsecure() {
		out = append(out, "PYDIO_DEV_INSECURE=1: /api/v1/* Pydio bridge UNAUTHENTICATED — never expose to internet")
	}
	if weakSecret(os.Getenv("JWT_SECRET")) {
		out = append(out, "JWT_SECRET is weak or default — change before any shared/staging deploy")
	}
	if token := os.Getenv("PYDIO_API_TOKEN"); token == "" || token == "archiflow_pydio_api_token_2024" {
		out = append(out, "PYDIO_API_TOKEN is default or empty — set strong token if Cells integration enabled")
	}
	if wh := os.Getenv("PYDIO_WEBHOOK_SECRET"); wh == "" || wh == "archiflow_pydio_webhook_secret_2024" {
		out = append(out, "PYDIO_WEBHOOK_SECRET is default or empty")
	}
	if isDefaultMinioCreds() {
		out = append(out, "MinIO uses default minioadmin credentials")
	}
	if OfficeEnabled() && weakOfficeSecret() {
		out = append(out, "ONLYOFFICE enabled but OFFICE_FILE_TOKEN_SECRET is weak, missing, or equals JWT_SECRET")
	}
	if wh := os.Getenv("SFTPGO_WEBHOOK_SECRET"); wh == "" || wh == "archiflow_sftpgo_webhook_secret_2024" {
		if strings.EqualFold(strings.TrimSpace(os.Getenv("SFTPGO_INTEGRATION_ENABLED")), "true") {
			out = append(out, "SFTPGO_WEBHOOK_SECRET is default or empty while SFTPGO_INTEGRATION_ENABLED=true")
		}
	}
	return out
}

func weakOfficeSecret() bool {
	secret := strings.TrimSpace(os.Getenv("OFFICE_FILE_TOKEN_SECRET"))
	if secret == "" {
		secret = strings.TrimSpace(os.Getenv("ONLYOFFICE_JWT_SECRET"))
	}
	if secret == "" {
		return true
	}
	if secret == strings.TrimSpace(os.Getenv("JWT_SECRET")) {
		return true
	}
	return weakSecret(secret)
}

func OfficeEnabled() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("ONLYOFFICE_ENABLED")), "true")
}

func officeFileTokenSecret() string {
	if s := strings.TrimSpace(os.Getenv("OFFICE_FILE_TOKEN_SECRET")); s != "" {
		return s
	}
	return strings.TrimSpace(os.Getenv("ONLYOFFICE_JWT_SECRET"))
}

func validateOfficeProduction() error {
	if !IsProduction() || !OfficeEnabled() {
		return nil
	}
	secret := officeFileTokenSecret()
	if secret == "" || weakSecret(secret) {
		return fmt.Errorf("set a strong OFFICE_FILE_TOKEN_SECRET (>= 32 chars, unique) when ONLYOFFICE_ENABLED=true in production")
	}
	if secret == strings.TrimSpace(os.Getenv("JWT_SECRET")) {
		return fmt.Errorf("OFFICE_FILE_TOKEN_SECRET must differ from JWT_SECRET in production")
	}
	return nil
}

func validatePydioWebhookProduction() error {
	if !IsProduction() {
		return nil
	}
	wh := strings.TrimSpace(os.Getenv("PYDIO_WEBHOOK_SECRET"))
	if wh == "" || wh == "archiflow_pydio_webhook_secret_2024" {
		return fmt.Errorf("set a strong PYDIO_WEBHOOK_SECRET in production")
	}
	return nil
}

func validatePresignedTTLProduction() error {
	if !IsProduction() {
		return nil
	}
	raw := strings.TrimSpace(os.Getenv("PRESIGNED_URL_TTL_MINUTES"))
	if raw == "" {
		return nil
	}
	// parsed in minio_upload; reject overly long presigned URLs in prod
	if n, err := parsePositiveInt(raw); err == nil && n > 60 {
		return fmt.Errorf("PRESIGNED_URL_TTL_MINUTES must be <= 60 in production")
	}
	return nil
}

func validateSftpGoProduction() error {
	if !IsProduction() {
		return nil
	}
	enabled := strings.EqualFold(strings.TrimSpace(os.Getenv("SFTPGO_INTEGRATION_ENABLED")), "true") ||
		os.Getenv("SFTPGO_INTEGRATION_ENABLED") == "1"
	if !enabled {
		return nil
	}
	wh := strings.TrimSpace(os.Getenv("SFTPGO_WEBHOOK_SECRET"))
	if wh == "" || wh == "archiflow_sftpgo_webhook_secret_2024" || weakSecret(wh) {
		return fmt.Errorf("set a strong SFTPGO_WEBHOOK_SECRET when SFTPGO_INTEGRATION_ENABLED=true in production")
	}
	return nil
}

func parsePositiveInt(s string) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	if err != nil || n <= 0 {
		return 0, fmt.Errorf("invalid")
	}
	return n, nil
}
