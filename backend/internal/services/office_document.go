package services

import (
	"path"
	"strings"
)

// Office integration (OnlyOffice Document Server).

var officeExtensions = map[string]struct {
	FileType     string
	DocumentType string
}{
	".doc":  {"doc", "word"},
	".docx": {"docx", "word"},
	".odt":  {"odt", "word"},
	".rtf":  {"rtf", "word"},
	".xls":  {"xls", "cell"},
	".xlsx": {"xlsx", "cell"},
	".ods":  {"ods", "cell"},
	".csv":  {"csv", "cell"},
	".ppt":  {"ppt", "slide"},
	".pptx": {"pptx", "slide"},
	".odp":  {"odp", "slide"},
}

func IsOfficeDocument(mimeType, fileName string) bool {
	_, _, ok := officeMeta(mimeType, fileName)
	return ok
}

func officeMeta(mimeType, fileName string) (fileType, documentType string, ok bool) {
	ext := strings.ToLower(path.Ext(fileName))
	if meta, found := officeExtensions[ext]; found {
		return meta.FileType, meta.DocumentType, true
	}
	m := strings.ToLower(strings.TrimSpace(mimeType))
	switch m {
	case "application/msword":
		return "doc", "word", true
	case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		return "docx", "word", true
	case "application/vnd.oasis.opendocument.text":
		return "odt", "word", true
	case "application/vnd.ms-excel":
		return "xls", "cell", true
	case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
		return "xlsx", "cell", true
	case "application/vnd.oasis.opendocument.spreadsheet":
		return "ods", "cell", true
	case "text/csv":
		return "csv", "cell", true
	case "application/vnd.ms-powerpoint":
		return "ppt", "slide", true
	case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
		return "pptx", "slide", true
	case "application/vnd.oasis.opendocument.presentation":
		return "odp", "slide", true
	default:
		return "", "", false
	}
}
