package models

import "time"

const (
	PermRead     = "lecture"
	PermDownload = "download"
	PermWrite    = "modification"
	PermComment  = "commentaire"
	PermShare    = "partage"
)

// DocumentShare partage d'un document vers un utilisateur.
type DocumentShare struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	DocumentID   uint           `gorm:"index;not null" json:"document_id"`
	SharedWithID uint           `gorm:"index;not null" json:"shared_with_id"`
	Permissions  string `gorm:"type:text" json:"permissions"` // JSON array
	SharedByID   uint           `json:"shared_by_id"`
	Active       bool           `gorm:"default:true" json:"active"`
	Message      string         `gorm:"type:text" json:"message"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`

	SharedWith *User     `gorm:"foreignKey:SharedWithID" json:"shared_with,omitempty"`
	Document   *Document `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
}

func (DocumentShare) TableName() string { return "document_shares" }

// DocumentComment commentaire sur document (thread via ParentID).
type DocumentComment struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	DocumentID uint      `gorm:"index;not null" json:"document_id"`
	Content    string    `gorm:"type:text;not null" json:"content"`
	AuthorID   uint      `gorm:"index;not null" json:"author_id"`
	ParentID   *uint     `gorm:"index" json:"parent_id,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	Author *User `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
}

func (DocumentComment) TableName() string { return "document_comments" }

// DocumentVersion version fichier historique.
type DocumentVersion struct {
	ID              uint      `gorm:"primarykey" json:"id"`
	DocumentID      uint      `gorm:"index:idx_versions_doc_version,priority:1;index;not null" json:"document_id"`
	VersionNumber   int       `gorm:"index:idx_versions_doc_version,priority:2;not null" json:"version_number"`
	FileName        string    `gorm:"size:1024" json:"file_name"`
	MinioBucket     string    `gorm:"size:100" json:"minio_bucket"`
	MinioObjectName string    `gorm:"size:500" json:"minio_object_name"`
	Size            int64     `json:"size"`
	MimeType        string    `gorm:"size:255" json:"mime_type"`
	CreatedByID     uint      `json:"created_by_id"`
	Comment         string    `gorm:"type:text" json:"comment"`
	CreatedAt       time.Time `json:"created_at"`
}

func (DocumentVersion) TableName() string { return "document_versions" }

// Tag étiquette couleur.
type Tag struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Name      string    `gorm:"size:100;uniqueIndex;not null" json:"name"`
	Color     string    `gorm:"size:32;default:#3b82f6" json:"color"`
	CreatedAt time.Time `json:"created_at"`
}

func (Tag) TableName() string { return "document_tags" }

// DocumentTagLink association document ↔ tag.
type DocumentTagLink struct {
	DocumentID uint `gorm:"primaryKey"`
	TagID      uint `gorm:"primaryKey"`
	TaggedAt   time.Time
}

func (DocumentTagLink) TableName() string { return "document_tag_links" }

// Notification in-app simple.
type Notification struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	UserID    uint      `gorm:"index;index:idx_notifications_user_read_created,priority:1;not null" json:"user_id"`
	Type      string    `gorm:"size:50" json:"type"`
	Title     string    `gorm:"size:255" json:"title"`
	Message   string    `gorm:"type:text" json:"message"`
	Link      string    `gorm:"size:512" json:"link"`
	IsRead    bool      `gorm:"default:false;index:idx_notifications_user_read_created,priority:2" json:"is_read"`
	CreatedAt time.Time `gorm:"index:idx_notifications_user_read_created,priority:3" json:"created_at"`
}

func (Notification) TableName() string { return "notifications" }
