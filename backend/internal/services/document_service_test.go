package services

import "testing"

func TestUploadMimeAllowed(t *testing.T) {
	tests := []struct {
		mime string
		ok   bool
	}{
		{mime: "application/pdf", ok: true},
		{mime: "image/png", ok: true},
		{mime: "text/plain", ok: true},
		{mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ok: true},
		{mime: "application/x-msdownload", ok: false},
		{mime: "application/x-sh", ok: false},
		{mime: "", ok: false},
	}
	for _, tc := range tests {
		got := uploadMimeAllowed(tc.mime)
		if got != tc.ok {
			t.Fatalf("uploadMimeAllowed(%q) = %v, want %v", tc.mime, got, tc.ok)
		}
	}
}

func TestBlockedUploadExtensions(t *testing.T) {
	blocked := []string{".exe", ".sh", ".ps1", ".js", ".dll"}
	for _, ext := range blocked {
		if _, ok := blockedUploadExt[ext]; !ok {
			t.Fatalf("expected blocked extension %s", ext)
		}
	}
	allowed := []string{".pdf", ".docx", ".xlsx", ".png", ".txt"}
	for _, ext := range allowed {
		if _, ok := blockedUploadExt[ext]; ok {
			t.Fatalf("unexpected blocked extension %s", ext)
		}
	}
}
