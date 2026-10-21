package services

import (
	"net/url"
	"testing"
)

func TestURLQueryEscapeUsesNetURL(t *testing.T) {
	in := "http://localhost:3000/api/wopi/files/1?x=a&b=c"
	got := urlQueryEscape(in)
	want := url.QueryEscape(in)
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
	if got == in {
		t.Fatal("expected escaping of reserved characters")
	}
}
