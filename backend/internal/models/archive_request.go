package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// ArchiveRequest demande d'archivage (API compatible Socle / plugin Cells).
type ArchiveRequest struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserUUID      string         `gorm:"column:user_uuid;size:64" json:"user_uuid"`
	UserLogin     string         `gorm:"column:user_login;size:255" json:"user_login"`
	WorkspaceUUID string         `gorm:"column:workspace_uuid;size:64" json:"workspace_uuid"`
	Nom           string         `gorm:"size:512" json:"nom"`
	Comment       string         `gorm:"type:text" json:"comment"`
	Status        string         `gorm:"size:64;default:pending" json:"status"`
	FilePath      string         `gorm:"column:file_path;size:1024" json:"file_path"`
	FileSize      int64          `json:"file_size"`
	ContentType   string         `gorm:"column:content_type;size:255" json:"content_type"`
	Data          datatypes.JSON `gorm:"type:jsonb" json:"data,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

func (ArchiveRequest) TableName() string {
	return "archives_requests"
}

// PydioArchiveRequest demande d'archivage initiée depuis Pydio Cells.
type PydioArchiveRequest struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	DocumentID   string         `gorm:"column:document_id;size:255;index" json:"document_id"`
	DocumentName string         `gorm:"column:document_name;size:512" json:"document_name"`
	Workspace    string         `gorm:"size:255" json:"workspace"`
	Path         string         `gorm:"size:1024" json:"path"`
	UserLogin    string         `gorm:"column:user_login;size:255" json:"user"`
	UserEmail    string         `gorm:"column:user_email;size:255" json:"user_email"`
	Status       string         `gorm:"size:64;default:pending" json:"status"`
	Metadata     datatypes.JSON `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

func (PydioArchiveRequest) TableName() string {
	return "pydio_archive_requests"
}

// PydioWebhookLog journal des webhooks Cells.
type PydioWebhookLog struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Event     string    `gorm:"size:128" json:"event"`
	NodeID    string    `gorm:"column:node_id;size:255" json:"node_id"`
	Payload   string    `gorm:"type:text" json:"payload"`
	CreatedAt time.Time `json:"created_at"`
}

func (PydioWebhookLog) TableName() string {
	return "pydio_webhook_logs"
}
