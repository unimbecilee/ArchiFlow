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

func PydioSignatureCheckSkipped() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("PYDIO_SKIP_SIGNATURE_CHECK")), "true")
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
	if PydioSignatureCheckSkipped() {
		return fmt.Errorf("PYDIO_SKIP_SIGNATURE_CHECK must not be true in production")
	}
	if token := os.Getenv("PYDIO_API_TOKEN"); token == "" || token == "archiflow_pydio_api_token_2024" {
		return fmt.Errorf("set a strong PYDIO_API_TOKEN in production")
	}
	return nil
}
