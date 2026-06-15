package services

import (
	"strings"
	"testing"
)

func TestExtractTextFromUpload_txt(t *testing.T) {
	body := "hello archiflow"
	got := ExtractTextFromUpload("note.txt", "text/plain", strings.NewReader(body))
	if got != body {
		t.Fatalf("got %q want %q", got, body)
	}
}

func TestExtractTextFromUpload_pdfSkipped(t *testing.T) {
	got := ExtractTextFromUpload("doc.pdf", "application/pdf", strings.NewReader("%PDF"))
	if got != "" {
		t.Fatalf("expected empty, got %q", got)
	}
}
