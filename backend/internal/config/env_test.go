package config

import (
	"os"
	"testing"
)

func TestPublicRegisterAllowed(t *testing.T) {
	prevEnv := os.Getenv("ENVIRONMENT")
	prevRegister := os.Getenv("AUTH_ALLOW_PUBLIC_REGISTER")
	defer func() {
		_ = os.Setenv("ENVIRONMENT", prevEnv)
		_ = os.Setenv("AUTH_ALLOW_PUBLIC_REGISTER", prevRegister)
	}()

	_ = os.Setenv("ENVIRONMENT", "production")
	_ = os.Unsetenv("AUTH_ALLOW_PUBLIC_REGISTER")
	if PublicRegisterAllowed() {
		t.Fatal("expected register disabled by default in production")
	}

	_ = os.Setenv("AUTH_ALLOW_PUBLIC_REGISTER", "true")
	if !PublicRegisterAllowed() {
		t.Fatal("expected register enabled when explicit true")
	}

	_ = os.Setenv("AUTH_ALLOW_PUBLIC_REGISTER", "false")
	if PublicRegisterAllowed() {
		t.Fatal("expected register disabled when explicit false")
	}

	_ = os.Setenv("ENVIRONMENT", "development")
	_ = os.Unsetenv("AUTH_ALLOW_PUBLIC_REGISTER")
	if !PublicRegisterAllowed() {
		t.Fatal("expected register enabled by default in development")
	}
}

func TestValidateSecurityForEnvProduction(t *testing.T) {
	keys := []string{
		"ENVIRONMENT", "JWT_SECRET", "JWT_REFRESH_SECRET", "PYDIO_API_TOKEN", "PYDIO_WEBHOOK_SECRET",
		"MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "COOKIE_SECURE",
		"AUTH_ALLOW_PUBLIC_REGISTER", "DATABASE_URL", "PYDIO_DEV_INSECURE",
		"ONLYOFFICE_ENABLED", "OFFICE_FILE_TOKEN_SECRET", "PRESIGNED_URL_TTL_MINUTES",
	}
	prev := make(map[string]string, len(keys))
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
	_ = os.Setenv("JWT_SECRET", "production-jwt-secret-key-32chars-min")
	_ = os.Setenv("JWT_REFRESH_SECRET", "production-refresh-secret-32chars-min")
	_ = os.Setenv("PYDIO_API_TOKEN", "strong-pydio-token-for-production-use")
	_ = os.Setenv("PYDIO_WEBHOOK_SECRET", "strong-pydio-webhook-secret-production")
	_ = os.Setenv("MINIO_ACCESS_KEY", "prod-minio-key")
	_ = os.Setenv("MINIO_SECRET_KEY", "prod-minio-secret-value-here")
	_ = os.Unsetenv("COOKIE_SECURE")
	_ = os.Unsetenv("AUTH_ALLOW_PUBLIC_REGISTER")
	_ = os.Setenv("DATABASE_URL", "postgresql://u:p@host:5432/db?sslmode=require")
	_ = os.Unsetenv("PYDIO_DEV_INSECURE")

	if err := ValidateSecurityForEnv(); err != nil {
		t.Fatalf("expected ok: %v", err)
	}

	_ = os.Setenv("MINIO_ACCESS_KEY", "minioadmin")
	_ = os.Setenv("MINIO_SECRET_KEY", "minioadmin123")
	if err := ValidateSecurityForEnv(); err == nil {
		t.Fatal("expected minio default creds rejected")
	}
	_ = os.Setenv("MINIO_ACCESS_KEY", "prod-minio-key")
	_ = os.Setenv("MINIO_SECRET_KEY", "prod-minio-secret-value-here")

	_ = os.Setenv("COOKIE_SECURE", "false")
	if err := ValidateSecurityForEnv(); err == nil {
		t.Fatal("expected COOKIE_SECURE=false rejected")
	}
	_ = os.Unsetenv("COOKIE_SECURE")

	_ = os.Setenv("AUTH_ALLOW_PUBLIC_REGISTER", "true")
	if err := ValidateSecurityForEnv(); err == nil {
		t.Fatal("expected public register rejected in prod")
	}
}
