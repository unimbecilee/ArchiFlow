package dto

import (
	"time"

	"archiflow/backend/internal/models"
)

// Register
type RegisterRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=8"`
	FirstName string `json:"first_name" validate:"required,max=100"`
	LastName  string `json:"last_name" validate:"required,max=100"`
}

type RegisterResponse struct {
	User         UserResponse        `json:"user"`
	Token        PublicTokenResponse `json:"token"`
	RefreshToken string              `json:"-"` // HttpOnly cookie only
}

// Login
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	User         UserResponse        `json:"user"`
	Token        PublicTokenResponse `json:"token"`
	RefreshToken string              `json:"-"` // HttpOnly cookie only
}

// Refresh
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshResponse struct {
	Token        PublicTokenResponse `json:"token"`
	RefreshToken string              `json:"-"` // HttpOnly cookie only
}

// PublicTokenResponse access token returned to the SPA (refresh in cookie).
type PublicTokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int64  `json:"expires_in"`
}

// User
type UserResponse struct {
	ID          uint       `json:"id"`
	Email       string     `json:"email"`
	FirstName   string     `json:"first_name"`
	LastName    string     `json:"last_name"`
	Role        string     `json:"role"`
	AvatarURL   string     `json:"avatar_url"`
	Department     string     `json:"department,omitempty"`
	ClearanceLevel string     `json:"clearance_level,omitempty"`
	SftpEnabled        bool       `json:"sftp_enabled"`
	SftpMode           string     `json:"sftp_mode"`
	IsActive           bool       `json:"is_active"`
	MustChangePassword bool       `json:"must_change_password"`
	PydioLinked        bool       `json:"pydio_linked,omitempty"`
	LastLoginAt        *time.Time `json:"last_login_at"`
	CreatedAt          time.Time  `json:"created_at"`
	Capabilities       models.RoleCapabilities `json:"capabilities"`
}

// Update Profile
type UpdateProfileRequest struct {
	FirstName string `json:"first_name" validate:"omitempty,max=100"`
	LastName  string `json:"last_name" validate:"omitempty,max=100"`
	AvatarURL string `json:"avatar_url" validate:"omitempty,url"`
}

// Change Password
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}

// Forgot Password
type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// Reset Password
type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// Error Response
type ErrorResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Errors  interface{} `json:"errors,omitempty"`
}

// Success Response
type SuccessResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
