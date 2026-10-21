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
	if token := strings.TrimSpace(os.Getenv("PYDIO_API_TOKEN")); token == "" {
		out = append(out, "PYDIO_API_TOKEN is empty — set strong token if Cells integration enabled")
	}
	if wh := strings.TrimSpace(os.Getenv("PYDIO_WEBHOOK_SECRET")); wh == "" {
		out = append(out, "PYDIO_WEBHOOK_SECRET is empty")
	}
	if isDefaultMinioCreds() {
		out = append(out, "MinIO credentials missing or still using weak defaults")
	}
	if (OfficeEnabled() || CollaboraEnabled()) && weakOfficeSecret() {
		out = append(out, "Office/Collabora enabled but OFFICE_FILE_TOKEN_SECRET is weak, missing, or equals JWT_SECRET")
	}
	if sftpGoIntegrationEnabled() {
		if wh := strings.TrimSpace(os.Getenv("SFTPGO_WEBHOOK_SECRET")); wh == "" || weakSecret(wh) {
			out = append(out, "SFTPGO_WEBHOOK_SECRET is empty or weak while SFTPGo integration enabled")
		}
		if pwd := strings.TrimSpace(os.Getenv("SFTPGO_USER_PASSWORD_SECRET")); pwd == "" || weakSecret(pwd) {
			out = append(out, "SFTPGO_USER_PASSWORD_SECRET is missing or weak while SFTPGo upload enabled")
		}
		if strings.TrimSpace(os.Getenv("MINIO_SFTP_ACCESS_KEY")) == "" || strings.TrimSpace(os.Getenv("MINIO_SFTP_SECRET_KEY")) == "" {
			out = append(out, "MINIO_SFTP_ACCESS_KEY/SECRET unset — auth hook will not embed root MinIO creds (set scoped keys)")
		}
		if strings.EqualFold(strings.TrimSpace(os.Getenv("SFTPGO_ALLOW_ROOT_MINIO_CREDS")), "true") ||
			os.Getenv("SFTPGO_ALLOW_ROOT_MINIO_CREDS") == "1" {
			out = append(out, "SFTPGO_ALLOW_ROOT_MINIO_CREDS=1: auth hook may return root MinIO credentials — never use in shared/staging")
		}
	}
	return out
}

func sftpGoIntegrationEnabled() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("SFTPGO_INTEGRATION_ENABLED")), "true") ||
		os.Getenv("SFTPGO_INTEGRATION_ENABLED") == "1"
}

// CollaboraEnabled reports COLLABORA_ENABLED=true.
func CollaboraEnabled() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("COLLABORA_ENABLED")), "true")
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
	if !IsProduction() || (!OfficeEnabled() && !CollaboraEnabled()) {
		return nil
	}
	secret := officeFileTokenSecret()
	if secret == "" || weakSecret(secret) {
		return fmt.Errorf("set a strong OFFICE_FILE_TOKEN_SECRET (>= 32 chars, unique) when ONLYOFFICE or Collabora is enabled in production")
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
	if wh == "" || weakSecret(wh) {
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
	if !IsProduction() || !sftpGoIntegrationEnabled() {
		return nil
	}
	wh := strings.TrimSpace(os.Getenv("SFTPGO_WEBHOOK_SECRET"))
	if wh == "" || weakSecret(wh) {
		return fmt.Errorf("set a strong SFTPGO_WEBHOOK_SECRET when SFTPGO_INTEGRATION_ENABLED=true in production")
	}
	pwd := strings.TrimSpace(os.Getenv("SFTPGO_USER_PASSWORD_SECRET"))
	if pwd == "" || weakSecret(pwd) {
		return fmt.Errorf("set a strong SFTPGO_USER_PASSWORD_SECRET when SFTPGO_INTEGRATION_ENABLED=true in production")
	}
	if strings.TrimSpace(os.Getenv("MINIO_SFTP_ACCESS_KEY")) == "" || strings.TrimSpace(os.Getenv("MINIO_SFTP_SECRET_KEY")) == "" {
		return fmt.Errorf("set MINIO_SFTP_ACCESS_KEY and MINIO_SFTP_SECRET_KEY (scoped inbox) when SFTPGo is enabled in production")
	}
	if strings.EqualFold(strings.TrimSpace(os.Getenv("SFTPGO_ALLOW_ROOT_MINIO_CREDS")), "true") ||
		os.Getenv("SFTPGO_ALLOW_ROOT_MINIO_CREDS") == "1" {
		return fmt.Errorf("SFTPGO_ALLOW_ROOT_MINIO_CREDS must not be set in production")
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
