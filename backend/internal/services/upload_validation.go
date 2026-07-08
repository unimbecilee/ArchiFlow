package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
)

const MaxUploadBytes = 20 * 1024 * 1024

var blockedUploadExt = map[string]struct{}{
	".exe": {}, ".bat": {}, ".cmd": {}, ".com": {},
	".sh": {}, ".ps1": {}, ".msi": {}, ".dll": {},
	".scr": {}, ".jar": {}, ".vbs": {}, ".js": {},
	".html": {}, ".htm": {}, ".svg": {},
}

var blockedUploadMime = map[string]struct{}{
	"text/html":     {},
	"image/svg+xml": {},
}

var allowedUploadMimePrefix = []string{
	"image/",
	"text/",
}

var allowedUploadMimeExact = map[string]struct{}{
	"application/pdf": {},
	"application/json": {},
	"application/xml": {},
	"application/zip": {},
	"application/x-zip-compressed": {},
	"application/vnd.ms-excel": {},
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {},
	"application/vnd.ms-powerpoint": {},
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": {},
	"application/msword": {},
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {},
	"application/vnd.oasis.opendocument.text":         {},
	"application/vnd.oasis.opendocument.spreadsheet":    {},
	"application/vnd.oasis.opendocument.presentation":   {},
}

func uploadMimeAllowed(m string) bool {
	m = strings.ToLower(strings.TrimSpace(m))
	if m == "" {
		return false
	}
	if _, blocked := blockedUploadMime[m]; blocked {
		return false
	}
	if _, ok := allowedUploadMimeExact[m]; ok {
		return true
	}
	for _, p := range allowedUploadMimePrefix {
		if strings.HasPrefix(m, p) {
			return true
		}
	}
	return false
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
