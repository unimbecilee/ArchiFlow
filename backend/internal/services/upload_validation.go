package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"

	"archiflow/backend/internal/config"
)

const MaxUploadBytes = 20 * 1024 * 1024

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

// ValidateUploadFile checks extension, size, and MIME for multipart uploads.
func ValidateUploadFile(fh *multipart.FileHeader) (contentType string, raw []byte, err error) {
	if fh == nil {
		return "", nil, fmt.Errorf("file is required")
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

	raw, err = io.ReadAll(io.LimitReader(file, MaxUploadBytes+1))
	if err != nil {
		return "", nil, err
	}
	if len(raw) == 0 {
		return "", nil, fmt.Errorf("fichier vide")
	}
	if len(raw) > MaxUploadBytes {
		return "", nil, fmt.Errorf("fichier trop volumineux (max %d Mo)", MaxUploadBytes/(1024*1024))
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
