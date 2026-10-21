package services

import (
	"os"
	"testing"
)

func TestSftpMinioCredsRequiresScopedInProd(t *testing.T) {
	keys := []string{
		"ENVIRONMENT", "MINIO_SFTP_ACCESS_KEY", "MINIO_SFTP_SECRET_KEY",
		"MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "SFTPGO_ALLOW_ROOT_MINIO_CREDS",
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
	_ = os.Unsetenv("MINIO_SFTP_ACCESS_KEY")
	_ = os.Unsetenv("MINIO_SFTP_SECRET_KEY")
	_ = os.Setenv("MINIO_ACCESS_KEY", "minioadmin")
	_ = os.Setenv("MINIO_SECRET_KEY", "minioadmin123")
	_ = os.Unsetenv("SFTPGO_ALLOW_ROOT_MINIO_CREDS")
	if _, _, ok := sftpMinioCreds(); ok {
		t.Fatal("production must not fall back to root MinIO keys")
	}

	_ = os.Setenv("MINIO_SFTP_ACCESS_KEY", "sftp-inbox")
	_ = os.Setenv("MINIO_SFTP_SECRET_KEY", "sftp-inbox-secret-value")
	access, secret, ok := sftpMinioCreds()
	if !ok || access != "sftp-inbox" || secret != "sftp-inbox-secret-value" {
		t.Fatalf("expected scoped keys, got ok=%v %q %q", ok, access, secret)
	}
}

func TestSftpMinioCredsDevRootOptIn(t *testing.T) {
	keys := []string{
		"ENVIRONMENT", "MINIO_SFTP_ACCESS_KEY", "MINIO_SFTP_SECRET_KEY",
		"MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "SFTPGO_ALLOW_ROOT_MINIO_CREDS",
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

	_ = os.Setenv("ENVIRONMENT", "development")
	_ = os.Unsetenv("MINIO_SFTP_ACCESS_KEY")
	_ = os.Unsetenv("MINIO_SFTP_SECRET_KEY")
	_ = os.Setenv("MINIO_ACCESS_KEY", "minioadmin")
	_ = os.Setenv("MINIO_SECRET_KEY", "minioadmin123")
	_ = os.Unsetenv("SFTPGO_ALLOW_ROOT_MINIO_CREDS")
	if _, _, ok := sftpMinioCreds(); ok {
		t.Fatal("dev without opt-in must not use root MinIO keys")
	}

	_ = os.Setenv("SFTPGO_ALLOW_ROOT_MINIO_CREDS", "1")
	access, _, ok := sftpMinioCreds()
	if !ok || access != "minioadmin" {
		t.Fatalf("expected root opt-in in dev, ok=%v access=%q", ok, access)
	}
}
