package services

import (
	"testing"

	"archiflow/backend/internal/models"
)

func TestResolveObjectLocation(t *testing.T) {
	doc := &models.Document{
		MinioBucket:     "",
		MinioObjectName: "",
		MinioURL:        "archiflow-documents/abc-123.pdf",
	}
	bucket, key := resolveObjectLocation(doc, "archiflow-documents")
	if bucket != "archiflow-documents" || key != "abc-123.pdf" {
		t.Fatalf("got %q/%q", bucket, key)
	}

	doc2 := &models.Document{
		MinioBucket:     "archiflow-documents",
		MinioObjectName: "direct-key.docx",
	}
	bucket, key = resolveObjectLocation(doc2, "archiflow-documents")
	if bucket != "archiflow-documents" || key != "direct-key.docx" {
		t.Fatalf("got %q/%q", bucket, key)
	}
}

func TestIsPreviewable(t *testing.T) {
	if !IsPreviewable("application/octet-stream", "report.pdf") {
		t.Fatal("pdf by extension")
	}
	if !IsPreviewable("text/csv", "data.csv") {
		t.Fatal("csv")
	}
	if IsPreviewable("application/zip", "a.zip") {
		t.Fatal("zip should not be inline previewable")
	}
}

func TestUploadMimeAllowed(t *testing.T) {
	tests := []struct {
		mime string
		ok   bool
	}{
		{mime: "application/pdf", ok: true},
		{mime: "image/png", ok: true},
		{mime: "text/plain", ok: true},
		{mime: "video/mp4", ok: true},
		{mime: "video/x-matroska", ok: true},
		{mime: "audio/mpeg", ok: true},
		{mime: "application/zip", ok: true},
		{mime: "application/octet-stream", ok: true},
		{mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ok: true},
		{mime: "text/html", ok: false},
		{mime: "image/svg+xml", ok: false},
		{mime: "application/javascript", ok: false},
		{mime: "application/x-sh", ok: false},
	}
	for _, tc := range tests {
		got := uploadMimeAllowed(tc.mime)
		if got != tc.ok {
			t.Fatalf("uploadMimeAllowed(%q) = %v, want %v", tc.mime, got, tc.ok)
		}
	}
}

func TestBlockedUploadExtensions(t *testing.T) {
	blocked := []string{".exe", ".msi", ".vbs", ".dll", ".html"}
	for _, ext := range blocked {
		if _, ok := blockedUploadExt[ext]; !ok {
			t.Fatalf("expected blocked extension %s", ext)
		}
	}
	allowed := []string{".pdf", ".mp4", ".mkv", ".mov", ".avi", ".zip", ".7z", ".png"}
	for _, ext := range allowed {
		if _, ok := blockedUploadExt[ext]; ok {
			t.Fatalf("unexpected blocked extension %s", ext)
		}
	}
}
