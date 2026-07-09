package services

import "testing"

func TestSanitizeFolderName(t *testing.T) {
	got, err := sanitizeFolderName("  MHA  ")
	if err != nil || got != "MHA" {
		t.Fatalf("got %q err %v", got, err)
	}
	_, err = sanitizeFolderName("   ")
	if err == nil {
		t.Fatal("expected error for empty name")
	}
	got, err = sanitizeFolderName("Season/01")
	if err != nil || got != "Season01" {
		t.Fatalf("got %q", got)
	}
}
