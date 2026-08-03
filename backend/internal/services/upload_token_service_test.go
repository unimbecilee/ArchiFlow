package services

import "testing"

func TestParseFolderIDFromVirtualPath(t *testing.T) {
	id := ParseFolderIDFromVirtualPath("/folders/42/a/b.mkv")
	if id == nil || *id != 42 {
		t.Fatalf("got %v", id)
	}
	if ParseFolderIDFromVirtualPath("/uploads/x.bin") != nil {
		t.Fatal("expected nil for uploads path")
	}
}

func TestSanitizeUploadRelativePath(t *testing.T) {
	got, err := sanitizeUploadRelativePath("a/b", "c.mkv")
	if err != nil {
		t.Fatal(err)
	}
	if got != "a/b/c.mkv" {
		t.Fatalf("got %q", got)
	}
	_, err = sanitizeUploadRelativePath("../x", "a.bin")
	if err == nil {
		t.Fatal("expected traversal error")
	}
}

func TestPreferSFTPGoForSize(t *testing.T) {
	t.Setenv("SFTPGO_INTEGRATION_ENABLED", "true")
	t.Setenv("UPLOAD_SFTPGO_MAX_BYTES", "0")
	if !PreferSFTPGoForSize(1 << 40) {
		t.Fatal("expected sftpgo for all sizes when threshold 0")
	}
}
