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
