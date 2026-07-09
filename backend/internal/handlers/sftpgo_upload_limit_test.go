package handlers

import (
	"os"
	"testing"
)

func TestSftpMaxUploadBytesDefault(t *testing.T) {
	os.Unsetenv("SFTP_MAX_FILE_BYTES")
	os.Unsetenv("SFTP_MAX_FILE_GB")
	got := sftpMaxUploadBytes()
	want := int64(50 * (1 << 30))
	if got != want {
		t.Fatalf("default max = %d, want %d", got, want)
	}
}

func TestSftpMaxUploadBytesEnvGB(t *testing.T) {
	t.Setenv("SFTP_MAX_FILE_GB", "100")
	got := sftpMaxUploadBytes()
	if got != 100*(1<<30) {
		t.Fatalf("got %d", got)
	}
}
