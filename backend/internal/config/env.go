package config

import (
	"fmt"
	"os"
	"strings"
)

func IsProduction() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("ENVIRONMENT")), "production")
}

func IsDevelopment() bool {
	return !IsProduction()
}

func PublicRegisterAllowed() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("AUTH_ALLOW_PUBLIC_REGISTER")))
	if v == "true" || v == "1" {
		return true
	}
	if v == "false" || v == "0" {
		return false
	}
	// Dev: open register. Prod: admin-only unless explicit opt-in.
	return IsDevelopment()
}

// PydioDevInsecure allows skipping Pydio API auth in development only (explicit opt-in).
func PydioDevInsecure() bool {
	if IsProduction() {
		return false
	}
	return strings.TrimSpace(os.Getenv("PYDIO_DEV_INSECURE")) == "1"
}

func PydioSignatureCheckSkipped() bool {
	return PydioDevInsecure()
}

func weakSecret(s string) bool {
	s = strings.TrimSpace(s)
	if len(s) < 32 {
		return true
	}
	lower := strings.ToLower(s)
	bad := []string{
		"change-me",
		"your-super-secret",
		"archiflow_pydio",
		"minioadmin",
	}
	for _, b := range bad {
		if strings.Contains(lower, b) {
			return true
		}
	}
	return false
}

func isDefaultMinioCreds() bool {
	ak := strings.TrimSpace(os.Getenv("MINIO_ACCESS_KEY"))
	sk := strings.TrimSpace(os.Getenv("MINIO_SECRET_KEY"))
	if ak == "" {
		ak = "minioadmin"
	}
	if sk == "" {
		sk = "minioadmin123"
	}
	return ak == "minioadmin" && sk == "minioadmin123"
}

func cookieSecureDisabledInProd() bool {
	v := strings.TrimSpace(os.Getenv("COOKIE_SECURE"))
	return strings.EqualFold(v, "false") || v == "0"
}

func ValidateSecurityForEnv() error {
	if !IsProduction() {
		return nil
	}
	if weakSecret(os.Getenv("JWT_SECRET")) {
		return fmt.Errorf("JWT_SECRET must be >= 32 chars and not a default value in production")
	}
	if weakSecret(os.Getenv("JWT_REFRESH_SECRET")) {
		return fmt.Errorf("JWT_REFRESH_SECRET must be >= 32 chars and not a default value in production")
	}
	if PydioDevInsecure() {
		return fmt.Errorf("PYDIO_DEV_INSECURE must not be set in production")
	}
	if token := os.Getenv("PYDIO_API_TOKEN"); token == "" || token == "archiflow_pydio_api_token_2024" {
		return fmt.Errorf("set a strong PYDIO_API_TOKEN in production")
	}
	if isDefaultMinioCreds() {
		return fmt.Errorf("MINIO_ACCESS_KEY and MINIO_SECRET_KEY must not use default minioadmin credentials in production")
	}
	if cookieSecureDisabledInProd() {
		return fmt.Errorf("COOKIE_SECURE must not be false in production")
	}
	if PublicRegisterAllowed() {
		return fmt.Errorf("AUTH_ALLOW_PUBLIC_REGISTER must be false in production unless explicitly reviewed")
	}
	if strings.Contains(strings.ToLower(os.Getenv("DATABASE_URL")), "sslmode=disable") {
		return fmt.Errorf("DATABASE_URL must use sslmode=require (or verify-full) in production")
	}
	if err := validatePydioWebhookProduction(); err != nil {
		return err
	}
	if err := validateOfficeProduction(); err != nil {
		return err
	}
	if err := validatePresignedTTLProduction(); err != nil {
		return err
	}
	if err := validateSftpGoProduction(); err != nil {
		return err
	}
	return nil
}
