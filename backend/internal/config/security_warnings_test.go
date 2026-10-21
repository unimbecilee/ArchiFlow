package config

import (
	"os"
	"testing"
)

func TestSecurityWarningsPydioDevInsecure(t *testing.T) {
	prev := os.Getenv("PYDIO_DEV_INSECURE")
	prevEnv := os.Getenv("ENVIRONMENT")
	defer func() {
		_ = os.Setenv("PYDIO_DEV_INSECURE", prev)
		_ = os.Setenv("ENVIRONMENT", prevEnv)
	}()
	_ = os.Setenv("ENVIRONMENT", "development")
	_ = os.Setenv("PYDIO_DEV_INSECURE", "1")
	w := SecurityWarnings()
	found := false
	for _, msg := range w {
		if msg != "" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected at least one security warning when PYDIO_DEV_INSECURE=1")
	}
}

func TestPresignedPreviewURLAllowedProduction(t *testing.T) {
	prevEnv := os.Getenv("ENVIRONMENT")
	prevAllow := os.Getenv("ALLOW_PRESIGNED_PREVIEW_URL")
	defer func() {
		_ = os.Setenv("ENVIRONMENT", prevEnv)
		_ = os.Setenv("ALLOW_PRESIGNED_PREVIEW_URL", prevAllow)
	}()
	_ = os.Setenv("ENVIRONMENT", "production")
	_ = os.Unsetenv("ALLOW_PRESIGNED_PREVIEW_URL")
	if PresignedPreviewURLAllowed() {
		t.Fatal("expected presigned preview URLs disabled by default in production")
	}
	_ = os.Setenv("ALLOW_PRESIGNED_PREVIEW_URL", "1")
	if !PresignedPreviewURLAllowed() {
		t.Fatal("expected opt-in to allow presigned preview URLs")
	}
}

func TestValidateOfficeProductionRequiresSecret(t *testing.T) {
	prevEnv := os.Getenv("ENVIRONMENT")
	prevOffice := os.Getenv("ONLYOFFICE_ENABLED")
	prevCollab := os.Getenv("COLLABORA_ENABLED")
	prevSecret := os.Getenv("OFFICE_FILE_TOKEN_SECRET")
	prevJWT := os.Getenv("JWT_SECRET")
	defer func() {
		_ = os.Setenv("ENVIRONMENT", prevEnv)
		_ = os.Setenv("ONLYOFFICE_ENABLED", prevOffice)
		_ = os.Setenv("COLLABORA_ENABLED", prevCollab)
		_ = os.Setenv("OFFICE_FILE_TOKEN_SECRET", prevSecret)
		_ = os.Setenv("JWT_SECRET", prevJWT)
	}()
	_ = os.Setenv("ENVIRONMENT", "production")
	_ = os.Setenv("ONLYOFFICE_ENABLED", "true")
	_ = os.Unsetenv("COLLABORA_ENABLED")
	_ = os.Setenv("JWT_SECRET", "production-jwt-secret-key-32chars-min")
	_ = os.Unsetenv("OFFICE_FILE_TOKEN_SECRET")
	if err := validateOfficeProduction(); err == nil {
		t.Fatal("expected office secret required when ONLYOFFICE enabled in prod")
	}

	_ = os.Unsetenv("ONLYOFFICE_ENABLED")
	_ = os.Setenv("COLLABORA_ENABLED", "true")
	if err := validateOfficeProduction(); err == nil {
		t.Fatal("expected office secret required when Collabora enabled in prod")
	}
}

func TestValidateSftpGoProductionRequiresSecrets(t *testing.T) {
	keys := []string{
		"ENVIRONMENT", "SFTPGO_INTEGRATION_ENABLED", "SFTPGO_WEBHOOK_SECRET",
		"SFTPGO_USER_PASSWORD_SECRET", "MINIO_SFTP_ACCESS_KEY", "MINIO_SFTP_SECRET_KEY",
		"SFTPGO_ALLOW_ROOT_MINIO_CREDS",
	}
	prev := map[string]string{}
	for _, k := range keys {
		prev[k] = os.Getenv(k)
	}
	defer func() {
		for k, v := range prev {
			if v == "" {
				_ = os.Unsetenv(k)
			} else {
				_ = os.Setenv(k, v)
			}
		}
	}()

	_ = os.Setenv("ENVIRONMENT", "production")
	_ = os.Setenv("SFTPGO_INTEGRATION_ENABLED", "true")
	_ = os.Setenv("SFTPGO_WEBHOOK_SECRET", "strong-sftpgo-webhook-secret-32chars")
	_ = os.Setenv("SFTPGO_USER_PASSWORD_SECRET", "strong-sftpgo-user-pwd-secret-32ch")
	_ = os.Setenv("MINIO_SFTP_ACCESS_KEY", "sftp-inbox")
	_ = os.Setenv("MINIO_SFTP_SECRET_KEY", "sftp-inbox-secret-key-value")
	_ = os.Unsetenv("SFTPGO_ALLOW_ROOT_MINIO_CREDS")
	if err := validateSftpGoProduction(); err != nil {
		t.Fatalf("expected ok: %v", err)
	}

	_ = os.Unsetenv("SFTPGO_USER_PASSWORD_SECRET")
	if err := validateSftpGoProduction(); err == nil {
		t.Fatal("expected SFTPGO_USER_PASSWORD_SECRET required")
	}
	_ = os.Setenv("SFTPGO_USER_PASSWORD_SECRET", "strong-sftpgo-user-pwd-secret-32ch")

	_ = os.Unsetenv("MINIO_SFTP_ACCESS_KEY")
	if err := validateSftpGoProduction(); err == nil {
		t.Fatal("expected MINIO_SFTP_* required")
	}
}

func TestValidatePresignedTTLProductionCap(t *testing.T) {
	prevEnv := os.Getenv("ENVIRONMENT")
	prevTTL := os.Getenv("PRESIGNED_URL_TTL_MINUTES")
	defer func() {
		_ = os.Setenv("ENVIRONMENT", prevEnv)
		_ = os.Setenv("PRESIGNED_URL_TTL_MINUTES", prevTTL)
	}()
	_ = os.Setenv("ENVIRONMENT", "production")
	_ = os.Setenv("PRESIGNED_URL_TTL_MINUTES", "120")
	if err := validatePresignedTTLProduction(); err == nil {
		t.Fatal("expected presigned TTL > 60 rejected in production")
	}
	_ = os.Setenv("PRESIGNED_URL_TTL_MINUTES", "30")
	if err := validatePresignedTTLProduction(); err != nil {
		t.Fatalf("expected 30m allowed: %v", err)
	}
}
