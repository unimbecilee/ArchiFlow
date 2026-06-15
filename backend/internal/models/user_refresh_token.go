package models

import "time"

// UserRefreshToken — session serveur (refresh opaque, rotation, révocation).
type UserRefreshToken struct {
	ID         string     `gorm:"primaryKey;size:36"`
	UserID     uint       `gorm:"index:idx_refresh_user_active,priority:1;not null"`
	FamilyID   string     `gorm:"index;size:36;not null"`
	TokenHash  string     `gorm:"uniqueIndex;size:64;not null"`
	UserAgent  string     `gorm:"size:512"`
	IPAddress  string     `gorm:"size:45"`
	ExpiresAt  time.Time  `gorm:"index;not null"`
	LastUsedAt time.Time  `gorm:"not null"`
	RevokedAt  *time.Time `gorm:"index"`
	CreatedAt  time.Time
}

func (UserRefreshToken) TableName() string {
	return "user_refresh_tokens"
}
