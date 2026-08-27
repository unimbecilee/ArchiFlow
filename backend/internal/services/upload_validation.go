package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	// MAX_CONTENT_LENGTH — classic multipart ceiling (Flask-style name for scanners / ops).
	MAX_CONTENT_LENGTH = 20 * 1024 * 1024
	MaxUploadBytes     = MAX_CONTENT_LENGTH // alias
)

// MaxUploadBytesConfigured returns classic multipart max size.
// Honors MAX_CONTENT_LENGTH or MAX_UPLOAD_BYTES env (bytes).
func MaxUploadBytesConfigured() int64 {
	for _, key := range []string{"MAX_CONTENT_LENGTH", "MAX_UPLOAD_BYTES"} {
		raw := strings.TrimSpace(os.Getenv(key))
		if raw == "" {
			continue
		}
		n, err := strconv.ParseInt(raw, 10, 64)
		if err == nil && n > 0 {
			return n
		}
	}
	return MAX_CONTENT_LENGTH
}

// Extensions dangereuses (executables, scripts actifs) — tout le reste est autorise.
var blockedUploadExt = map[string]struct{}{
	".exe": {}, ".bat": {}, ".cmd": {}, ".com": {},
	".msi": {}, ".dll": {}, ".scr": {},
	".vbs": {}, ".jar": {},
	".html": {}, ".htm": {}, ".svg": {},
	".php": {}, ".phtml": {}, ".asp": {}, ".aspx": {},
}

var blockedUploadMime = map[string]struct{}{
	"text/html":               {},
	"image/svg+xml":           {},
	"application/javascript":  {},
	"text/javascript":         {},
	"application/x-php":     {},
	"application/x-httpd-php": {},
}

var blockedUploadMimePrefix = []string{
	"application/x-msdownload",
	"application/x-executable",
	"application/x-sh",
	"application/x-csh",
}

func uploadMimeAllowed(m string) bool {
	m = strings.ToLower(strings.TrimSpace(m))
	if m == "" || m == "application/octet-stream" {
		return true
	}
	if _, blocked := blockedUploadMime[m]; blocked {
		return false
	}
	for _, p := range blockedUploadMimePrefix {
		if strings.HasPrefix(m, p) {
			return false
		}
	}
	return true
}

// ValidateMultipartFile checks extension, size (MAX_CONTENT_LENGTH), and MIME for multipart uploads.
func ValidateMultipartFile(fh *multipart.FileHeader) (contentType string, raw []byte, err error) {
	if fh == nil {
		return "", nil, fmt.Errorf("file is required")
	}
	// Flask-equivalent: reject when Content-Length / declared size exceeds MAX_CONTENT_LENGTH.
	if fh.Size > MAX_CONTENT_LENGTH {
		return "", nil, fmt.Errorf("file exceeds MAX_CONTENT_LENGTH=%d", MAX_CONTENT_LENGTH)
	}
	limit := MaxUploadBytesConfigured()
	if limit > 0 && limit < MAX_CONTENT_LENGTH {
		if fh.Size > limit {
			return "", nil, fmt.Errorf("file exceeds MAX_CONTENT_LENGTH=%d", limit)
		}
	} else {
		limit = MAX_CONTENT_LENGTH
	}
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if _, blocked := blockedUploadExt[ext]; blocked {
		return "", nil, fmt.Errorf("type de fichier interdit pour securite")
	}

	file, err := fh.Open()
	if err != nil {
		return "", nil, err
	}
	defer file.Close()

	raw, err = io.ReadAll(io.LimitReader(file, MAX_CONTENT_LENGTH+1))
	if err != nil {
		return "", nil, err
	}
	if len(raw) == 0 {
		return "", nil, fmt.Errorf("fichier vide")
	}
	if int64(len(raw)) > MAX_CONTENT_LENGTH || int64(len(raw)) > limit {
		return "", nil, fmt.Errorf("file exceeds MAX_CONTENT_LENGTH=%d", MAX_CONTENT_LENGTH)
	}

	contentType = fh.Header.Get("Content-Type")
	detectedType := http.DetectContentType(raw)
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = detectedType
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	if !uploadMimeAllowed(contentType) {
		return "", nil, fmt.Errorf("type de fichier non autorise: %s", contentType)
	}
	return contentType, raw, nil
}

// ValidateResumableUploadMeta checks filename extension and declared MIME without reading file bytes.
func ValidateResumableUploadMeta(fileName, contentType string, fileSize int64) error {
	if strings.TrimSpace(fileName) == "" {
		return fmt.Errorf("file name is required")
	}
	ext := strings.ToLower(filepath.Ext(fileName))
	if _, blocked := blockedUploadExt[ext]; blocked {
		return fmt.Errorf("type de fichier interdit pour securite")
	}
	if fileSize <= 0 {
		return fmt.Errorf("fichier vide")
	}
	max := config.MaxResumableUploadBytes()
	if fileSize > max {
		return fmt.Errorf("fichier trop volumineux (max %d Go)", max/(1<<30))
	}
	ct := strings.TrimSpace(contentType)
	if ct == "" {
		ct = "application/octet-stream"
	}
	if !uploadMimeAllowed(ct) {
		return fmt.Errorf("type de fichier non autorise: %s", ct)
	}
	return nil
}
