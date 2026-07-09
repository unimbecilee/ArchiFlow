package models

import (
	"time"

	"github.com/google/uuid"
)

const (
	UploadStatusPending    = "pending"
	UploadStatusUploading  = "uploading"
	UploadStatusCompleting = "completing"
	UploadStatusCompleted  = "completed"
	UploadStatusFailed     = "failed"
	UploadStatusAborted    = "aborted"
)

const (
	UploadPartPending   = "pending"
	UploadPartCompleted = "completed"
	UploadPartFailed    = "failed"
)

// UploadSession tracks a resumable S3 multipart upload.
type UploadSession struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID          uint      `gorm:"index;not null" json:"user_id"`
	FileName        string    `gorm:"size:1024;not null" json:"file_name"`
	FileSize        int64     `gorm:"not null" json:"file_size"`
	ContentType     string    `gorm:"size:255" json:"content_type"`
	FileSHA256      string    `gorm:"size:64;index" json:"file_sha256,omitempty"`
	MinioBucket     string    `gorm:"size:100;not null" json:"minio_bucket"`
	MinioUploadID   string    `gorm:"size:255;not null" json:"minio_upload_id"`
	MinioObjectKey  string    `gorm:"size:500;not null;index" json:"minio_object_key"`
	PartSize        int64     `gorm:"not null" json:"part_size"`
	Status          string    `gorm:"size:32;index;not null;default:pending" json:"status"`
	FolderID        *uint     `gorm:"index" json:"folder_id,omitempty"`
	Title           string    `gorm:"size:255" json:"title"`
	Description     string    `gorm:"type:text" json:"description,omitempty"`
	Category        string    `gorm:"size:100" json:"category,omitempty"`
	DocumentID      *uint     `gorm:"index" json:"document_id,omitempty"`
	ErrorMessage    string    `gorm:"type:text" json:"error_message,omitempty"`
	ExpiresAt       time.Time `gorm:"index;not null" json:"expires_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	Parts           []UploadPart `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"parts,omitempty"`
}

func (UploadSession) TableName() string { return "upload_sessions" }

// UploadPart records a completed multipart chunk.
type UploadPart struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	SessionID  uuid.UUID `gorm:"type:uuid;index;not null" json:"session_id"`
	PartNumber int       `gorm:"index;not null" json:"part_number"`
	ETag       string    `gorm:"size:128" json:"etag"`
	Size       int64     `json:"size"`
	Status     string    `gorm:"size:16;not null;default:pending" json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (UploadPart) TableName() string { return "upload_parts" }
