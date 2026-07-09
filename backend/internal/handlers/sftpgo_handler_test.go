package handlers

import (
	"testing"
)

func TestBlockedExtension(t *testing.T) {
	if !blockedExtension("evil.html") {
		t.Fatal("html should be blocked")
	}
	if !blockedExtension("X.SVG") {
		t.Fatal("svg should be blocked")
	}
	if blockedExtension("report.pdf") {
		t.Fatal("pdf should be allowed")
	}
}
