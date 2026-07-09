package dto

import "github.com/google/uuid"

type InitUploadRequest struct {
	FileName    string `json:"file_name"`
	FileSize    int64  `json:"file_size"`
	ContentType string `json:"content_type"`
	FileSHA256  string `json:"file_sha256,omitempty"`
	FolderID    *uint  `json:"folder_id,omitempty"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
	Category    string `json:"category,omitempty"`
}

type InitUploadResponse struct {
	SessionID      uuid.UUID `json:"session_id"`
	MinioUploadID  string    `json:"minio_upload_id"`
	ObjectKey      string    `json:"object_key"`
	PartSize       int64     `json:"part_size"`
	TotalParts     int       `json:"total_parts"`
	ExpiresAt      string    `json:"expires_at"`
	Resumed        bool      `json:"resumed"`
	CompletedParts []int     `json:"completed_parts,omitempty"`
}

type UploadPartURLResponse struct {
	PartNumber int    `json:"part_number"`
	URL        string `json:"url"`
	ExpiresIn  int    `json:"expires_in_seconds"`
}

type UploadSessionStatusResponse struct {
	SessionID      uuid.UUID      `json:"session_id"`
	Status         string         `json:"status"`
	FileName       string         `json:"file_name"`
	FileSize       int64          `json:"file_size"`
	PartSize       int64          `json:"part_size"`
	TotalParts     int            `json:"total_parts"`
	CompletedParts []PartStatus   `json:"completed_parts"`
	DocumentID     *uint          `json:"document_id,omitempty"`
	ErrorMessage   string         `json:"error_message,omitempty"`
}

type PartStatus struct {
	PartNumber int    `json:"part_number"`
	ETag       string `json:"etag"`
	Size       int64  `json:"size"`
}

type CompleteUploadRequest struct {
	Parts []CompletePartInput `json:"parts"`
}

type CompletePartInput struct {
	PartNumber int    `json:"part_number"`
	ETag       string `json:"etag"`
}

type CompleteUploadResponse struct {
	DocumentID uint   `json:"document_id"`
	Title      string `json:"title"`
	Status     string `json:"status"`
}
