package services

import (
	"os"
	"testing"
	"time"
)

func TestOfficeTokenTTLDefaults(t *testing.T) {
	prevEnv := os.Getenv("ENVIRONMENT")
	prevTTL := os.Getenv("OFFICE_FILE_TOKEN_TTL_MINUTES")
	defer func() {
		_ = os.Setenv("ENVIRONMENT", prevEnv)
		_ = os.Setenv("OFFICE_FILE_TOKEN_TTL_MINUTES", prevTTL)
	}()
	_ = os.Setenv("ENVIRONMENT", "production")
	_ = os.Unsetenv("OFFICE_FILE_TOKEN_TTL_MINUTES")
	if got := officeTokenTTL(); got != 30*time.Minute {
		t.Fatalf("prod default: want 30m, got %v", got)
	}
	_ = os.Setenv("ENVIRONMENT", "development")
	if got := officeTokenTTL(); got != 2*time.Hour {
		t.Fatalf("dev default: want 2h, got %v", got)
	}
	_ = os.Setenv("OFFICE_FILE_TOKEN_TTL_MINUTES", "15")
	if got := officeTokenTTL(); got != 15*time.Minute {
		t.Fatalf("env override: want 15m, got %v", got)
	}
}
