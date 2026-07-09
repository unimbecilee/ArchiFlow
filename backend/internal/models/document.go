package models

import "time"

const (
	DocumentStatusDraft     = "BROUILLON"
	DocumentStatusValidation = "EN_VALIDATION"
	DocumentStatusApproved  = "APPROUVE"
	DocumentStatusRejected  = "REJETE"
)

// Document métadonnées GED + référence MinIO.
type Document struct {
	ID              uint      `gorm:"primarykey" json:"id"`
	Title           string    `gorm:"size:255;not null" json:"title"`
	Description     string    `gorm:"type:text" json:"description"`
	FileName        string    `gorm:"size:1024" json:"file_name"`
	MimeType        string    `gorm:"size:255" json:"mime_type"`
	Size            int64     `json:"size"`
	Category        string    `gorm:"size:100" json:"category"`
	MinioBucket     string    `gorm:"size:100" json:"minio_bucket"`
	MinioObjectName string    `gorm:"size:500;index" json:"minio_object_name"`
	MinioURL        string    `gorm:"type:text" json:"minio_url"`
	OwnerID         uint      `gorm:"index:idx_documents_owner_folder_deleted,priority:1;index;not null" json:"owner_id"`
	FolderID        *uint     `gorm:"index:idx_documents_owner_folder_deleted,priority:2;index" json:"folder_id,omitempty"`
	CreatedByID     uint      `json:"created_by_id"`
	ModifiedByID    uint      `json:"modified_by_id"`
	Status               string `gorm:"size:32;default:BROUILLON" json:"status"`
	CurrentVersionNumber int    `gorm:"default:1" json:"current_version_number"`
	RejectedAtVersion    *int   `json:"rejected_at_version,omitempty"`
	Classification       string `gorm:"size:32;default:INTERNE;index" json:"classification"`
	Department           string `gorm:"size:100;index" json:"department"`
	IsArchived           bool   `gorm:"default:false" json:"is_archived"`
	ArchivedAt      *time.Time `json:"archived_at,omitempty"`
	IsDeleted       bool      `gorm:"default:false;index;index:idx_documents_owner_folder_deleted,priority:3" json:"is_deleted"`
	LockedByID      *uint      `gorm:"index" json:"locked_by_id,omitempty"`
	LockedAt        *time.Time `json:"locked_at,omitempty"`
	OCRText         string     `gorm:"type:text" json:"ocr_text,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (Document) TableName() string {
	return "documents"
}

// PydioDocumentSync lien Cells ↔ document ArchiFlow.
type PydioDocumentSync struct {
	ID                  uint      `gorm:"primarykey" json:"id"`
	PydioNodeID         string    `gorm:"column:pydio_node_id;size:255;uniqueIndex;not null" json:"pydio_node_id"`
	Name                string    `gorm:"size:500;not null" json:"name"`
	Path                string    `gorm:"size:1000;not null" json:"path"`
	MimeType            string    `gorm:"size:255" json:"mime_type"`
	Size                int64     `json:"size"`
	Workspace           string    `gorm:"size:255;default:'Common Files'" json:"workspace"`
	Metadata            string    `gorm:"type:text" json:"metadata"`
	ArchiflowDocumentID *uint     `gorm:"index" json:"archiflow_document_id,omitempty"`
	SyncStatus          string    `gorm:"size:50;default:synced" json:"sync_status"`
	LastSyncError       string    `gorm:"type:text" json:"last_sync_error,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

func (PydioDocumentSync) TableName() string {
	return "pydio_document_sync"
}
