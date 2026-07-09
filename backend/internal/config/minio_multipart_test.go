package config

import (
	"testing"
)

func TestTotalParts(t *testing.T) {
	if got := TotalParts(0, DefaultMultipartPartSize); got != 1 {
		t.Fatalf("empty file: got %d parts", got)
	}
	if got := TotalParts(DefaultMultipartPartSize, DefaultMultipartPartSize); got != 1 {
		t.Fatalf("one part: got %d", got)
	}
	if got := TotalParts(DefaultMultipartPartSize+1, DefaultMultipartPartSize); got != 2 {
		t.Fatalf("two parts: got %d", got)
	}
}

func TestMaxResumableUploadBytes(t *testing.T) {
	if MaxResumableUploadBytes() < 1<<30 {
		t.Fatal("expected at least 1 GiB default")
	}
}

func TestInitMinioPublicURL(t *testing.T) {
	if err := InitMinioPublicURL("localhost:9000", false, "minioadmin", "minioadmin123"); err != nil {
		t.Fatal(err)
	}
	if minioPresignClient == nil {
		t.Fatal("expected presign client for browser endpoint")
	}
}
