package models

import (
	"time"
)

type User struct {
	ID                uint       `gorm:"primarykey" json:"id"`
	Email             string     `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash      string     `gorm:"not null" json:"-"`
	PydioUserID       string     `gorm:"size:64" json:"-"`
	PydioPasswordEnc  string     `gorm:"type:text" json:"-"`
	FirstName         string     `json:"first_name"`
	LastName          string     `json:"last_name"`
	Role              string     `gorm:"default:user" json:"role"`
	AvatarURL         string     `json:"avatar_url"`
	Department        string     `gorm:"size:100;index" json:"department"`
	ClearanceLevel    string     `gorm:"size:32;default:INTERNE" json:"clearance_level"`
	SftpGoUsername    string     `gorm:"size:100" json:"-"`
	SftpEnabled       bool       `gorm:"default:false" json:"sftp_enabled"`
	SftpMode          string     `gorm:"size:16;default:none" json:"sftp_mode"`
	IsActive          bool       `gorm:"default:true" json:"is_active"`
	TokenVersion      uint       `gorm:"default:0;not null" json:"-"`
	MustChangePassword bool      `gorm:"default:false" json:"must_change_password"`
	// MFA
	MFAEnabled      bool       `gorm:"default:false" json:"mfa_enabled"`
	MFASecret       string     `gorm:"size:64" json:"-"`
	MFARecoveryCodes string    `gorm:"type:text" json:"-"` // JSON array of recovery codes
	LastLoginAt     *time.Time `json:"last_login_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}

func (u *User) FullName() string {
	return u.FirstName + " " + u.LastName
}

func (u *User) IsAdmin() bool {
	return u.Role == "admin"
}
