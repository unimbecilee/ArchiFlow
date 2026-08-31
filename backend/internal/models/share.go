package models

import (
	"time"

	"gorm.io/gorm"
)

type ExternalShare struct {
	ID               uint       `gorm:"primarykey" json:"id"`
	DocumentID       uint       `gorm:"index;not null" json:"document_id"`
	OwnerID          uint       `gorm:"index;not null" json:"owner_id"`
	Token            string     `gorm:"size:64;uniqueIndex;not null" json:"token"`
	PasswordHash     string     `gorm:"size:255" json:"-"`
	ExpiresAt        *time.Time `gorm:"index" json:"expires_at,omitempty"`
	MaxDownloads     int        `gorm:"default:0" json:"max_downloads"`
	DownloadCount    int        `gorm:"default:0" json:"download_count"`
	Permissions      string     `gorm:"type:text;not null" json:"permissions"`
	WatermarkEnabled bool       `gorm:"default:true" json:"watermark_enabled"`
	WatermarkText    string     `gorm:"size:255" json:"watermark_text,omitempty"`
	IsActive         bool       `gorm:"default:true;index" json:"is_active"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

func (ExternalShare) TableName() string { return "external_shares" }

type ShareAccessLog struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	ShareID   uint      `gorm:"index;not null" json:"share_id"`
	IP        string    `gorm:"size:64" json:"ip"`
	UserAgent string    `gorm:"size:512" json:"user_agent"`
	Action    string    `gorm:"size:32" json:"action"`
	Success   bool      `json:"success"`
	ErrorMsg  string    `gorm:"size:255" json:"error_msg,omitempty"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}

func (ShareAccessLog) TableName() string { return "share_access_logs" }

type FileRequest struct {
	ID             uint       `gorm:"primarykey" json:"id"`
	OwnerID        uint       `gorm:"index;not null" json:"owner_id"`
	FolderID       *uint      `gorm:"index" json:"folder_id,omitempty"`
	Token          string     `gorm:"size:64;uniqueIndex;not null" json:"token"`
	Title          string     `gorm:"size:255;not null" json:"title"`
	Description    string     `gorm:"type:text" json:"description,omitempty"`
	ExpiresAt      *time.Time `gorm:"index" json:"expires_at,omitempty"`
	MaxFiles       int        `gorm:"default:10" json:"max_files"`
	MaxFileSizeMB  int        `gorm:"default:100" json:"max_file_size_mb"`
	AllowedTypes   string     `gorm:"type:text" json:"allowed_types,omitempty"`
	PasswordHash   string     `gorm:"size:255" json:"-"`
	NotifyOnUpload bool       `gorm:"default:true" json:"notify_on_upload"`
	IsActive       bool       `gorm:"default:true;index" json:"is_active"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

func (FileRequest) TableName() string { return "file_requests" }

type FileRequestUpload struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	FileRequestID uint      `gorm:"index;not null" json:"file_request_id"`
	DocumentID    *uint     `gorm:"index" json:"document_id,omitempty"`
	FileName      string    `gorm:"size:255" json:"file_name"`
	Size          int64     `json:"size"`
	MimeType      string    `gorm:"size:128" json:"mime_type"`
	UploadedBy    string    `gorm:"size:255" json:"uploaded_by"`
	UploadedAt    time.Time `json:"uploaded_at"`
}

func (FileRequestUpload) TableName() string { return "file_request_uploads" }
