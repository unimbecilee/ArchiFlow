package handlers

import "testing"

func TestBlockedExtensionTable(t *testing.T) {
	cases := []struct {
		name    string
		blocked bool
	}{
		{"report.pdf", false},
		{"notes.TXT", false},
		{"evil.html", true},
		{"x.HTM", true},
		{"badge.SVG", true},
		{"run.exe", true},
		{"script.bat", true},
		{"script.CMD", true},
		{"app.js", true},
		{"shell.php", true},
		{"archive.tar.gz", false},
		{"noext", false},
	}
	for _, tc := range cases {
		if got := blockedExtension(tc.name); got != tc.blocked {
			t.Fatalf("%s: blocked=%v want %v", tc.name, got, tc.blocked)
		}
	}
}
