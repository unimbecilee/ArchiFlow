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
	prevSecret := os.Getenv("OFFICE_FILE_TOKEN_SECRET")
	prevJWT := os.Getenv("JWT_SECRET")
	defer func() {
		_ = os.Setenv("ENVIRONMENT", prevEnv)
		_ = os.Setenv("ONLYOFFICE_ENABLED", prevOffice)
		_ = os.Setenv("OFFICE_FILE_TOKEN_SECRET", prevSecret)
		_ = os.Setenv("JWT_SECRET", prevJWT)
	}()
	_ = os.Setenv("ENVIRONMENT", "production")
	_ = os.Setenv("ONLYOFFICE_ENABLED", "true")
	_ = os.Setenv("JWT_SECRET", "production-jwt-secret-key-32chars-min")
	_ = os.Unsetenv("OFFICE_FILE_TOKEN_SECRET")
	if err := validateOfficeProduction(); err == nil {
		t.Fatal("expected office secret required when ONLYOFFICE enabled in prod")
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
