package services

import (
	"io"
	"path/filepath"
	"strings"
	"unicode/utf8"
)

const ocrMaxBytes = 512 * 1024

// ExtractTextFromUpload extrait du texte indexable (txt, csv, md, mime text/*).
func ExtractTextFromUpload(filename, mime string, r io.Reader) string {
	ext := strings.ToLower(filepath.Ext(filename))
	isTextMime := strings.HasPrefix(strings.ToLower(mime), "text/")
	isTextExt := ext == ".txt" || ext == ".md" || ext == ".csv" || ext == ".json" || ext == ".log"
	if !isTextMime && !isTextExt {
		return ""
	}
	b, err := io.ReadAll(io.LimitReader(r, ocrMaxBytes))
	if err != nil || len(b) == 0 {
		return ""
	}
	if !utf8.Valid(b) {
		return ""
	}
	return strings.TrimSpace(string(b))
}
