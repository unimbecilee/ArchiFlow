package utils

import (
	"mime"
	"net/http"
	"path"
	"strings"
)

// SafeFileExt returns a lowercase extension safe for object storage keys.
func SafeFileExt(original string) string {
	ext := strings.ToLower(path.Ext(path.Base(original)))
	if ext == "" || len(ext) > 12 {
		return ""
	}
	for _, r := range ext {
		if (r >= 'a' && r <= 'z') || r == '.' || (r >= '0' && r <= '9') {
			continue
		}
		return ""
	}
	if strings.Contains(ext, "..") {
		return ""
	}
	return ext
}

// SanitizeDisplayFilename strips path segments for Content-Disposition.
func SanitizeDisplayFilename(name string) string {
	name = path.Base(strings.TrimSpace(name))
	if name == "" || name == "." {
		return "document"
	}
	name = strings.Map(func(r rune) rune {
		if r < 32 || r == '"' || r == '\\' {
			return -1
		}
		return r
	}, name)
	if name == "" {
		return "document"
	}
	return name
}

// ContentDispositionAttachment builds a safe attachment header.
func ContentDispositionAttachment(filename string) string {
	fn := SanitizeDisplayFilename(filename)
	return mime.FormatMediaType("attachment", map[string]string{"filename": fn})
}

func ContentDispositionInline(filename string) string {
	fn := SanitizeDisplayFilename(filename)
	return mime.FormatMediaType("inline", map[string]string{"filename": fn})
}

// ApplyPreviewSecurityHeaders mitigates XSS when serving HTML/SVG inline previews.
func ApplyPreviewSecurityHeaders(h http.Header, mime string) {
	if strings.HasPrefix(mime, "text/html") || mime == "image/svg+xml" {
		h.Set("Content-Security-Policy", "sandbox")
		h.Set("X-Content-Type-Options", "nosniff")
	}
}
