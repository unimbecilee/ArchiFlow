package models

import "time"

// Folder arborescence GED (équivalent dossier esag_ged).
type Folder struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	OwnerID     uint      `gorm:"index;not null" json:"owner_id"`
	ParentID    *uint     `gorm:"index" json:"parent_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Folder) TableName() string {
	return "folders"
}
