package models

import "time"

type RetentionPolicy struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	Name          string    `gorm:"size:100;not null" json:"name"`
	DurationYears int       `gorm:"not null" json:"duration_years"`
	Classification string   `gorm:"size:32" json:"classification"`
	FolderID      *uint     `gorm:"index" json:"folder_id,omitempty"`
	LegalHold     bool      `gorm:"default:false" json:"legal_hold"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (RetentionPolicy) TableName() string { return "retention_policies" }

type LegalHold struct {
	ID         uint       `gorm:"primarykey" json:"id"`
	DocumentID uint       `gorm:"index;not null" json:"document_id"`
	Reason     string     `gorm:"type:text" json:"reason"`
	HeldByID   uint       `json:"held_by_id"`
	HeldAt     time.Time  `json:"held_at"`
	ReleasedAt *time.Time `json:"released_at,omitempty"`
}

func (LegalHold) TableName() string { return "legal_holds" }

type NotificationPreference struct {
	ID        uint   `gorm:"primarykey" json:"id"`
	UserID    uint   `gorm:"uniqueIndex;not null" json:"user_id"`
	EmailDigest  bool `gorm:"default:true" json:"email_digest"`
	DigestHour   int  `gorm:"default:8" json:"digest_hour"`
	PushEnabled  bool `gorm:"default:false" json:"push_enabled"`
	PrefsJSON    string `gorm:"type:text" json:"prefs_json"`
}

func (NotificationPreference) TableName() string { return "notification_preferences" }
