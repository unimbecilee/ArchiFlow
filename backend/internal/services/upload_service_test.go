package services

import (
	"testing"

	"archiflow/backend/internal/config"
)

func TestTotalPartsCalculation(t *testing.T) {
	partSize := int64(64 << 20)
	cases := []struct {
		size int64
		want int
	}{
		{0, 1},
		{1, 1},
		{partSize, 1},
		{partSize + 1, 2},
		{50 * (1 << 30), config.TotalParts(50*(1<<30), partSize)},
	}
	for _, tc := range cases {
		got := config.TotalParts(tc.size, partSize)
		if got < 1 {
			t.Fatalf("size %d: got %d parts", tc.size, got)
		}
		if tc.size == 0 && got != 1 {
			t.Fatalf("empty size should be 1 part, got %d", got)
		}
	}
}

func TestValidateResumableUploadMeta(t *testing.T) {
	if err := ValidateResumableUploadMeta("doc.pdf", "application/pdf", 1024); err != nil {
		t.Fatalf("expected ok: %v", err)
	}
	if err := ValidateResumableUploadMeta("clip.mp4", "video/mp4", 1<<30); err != nil {
		t.Fatalf("video expected ok: %v", err)
	}
	if err := ValidateResumableUploadMeta("virus.exe", "application/octet-stream", 1024); err == nil {
		t.Fatal("expected blocked extension")
	}
	if err := ValidateResumableUploadMeta("page.html", "text/html", 1024); err == nil {
		t.Fatal("expected blocked mime")
	}
}
