package models

import "time"

// DocumentFavorite signet utilisateur sur document.
type DocumentFavorite struct {
	UserID     uint      `gorm:"primaryKey" json:"user_id"`
	DocumentID uint      `gorm:"primaryKey;index" json:"document_id"`
	CreatedAt  time.Time `json:"created_at"`
}

func (DocumentFavorite) TableName() string { return "document_favorites" }
