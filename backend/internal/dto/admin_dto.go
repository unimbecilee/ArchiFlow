package dto

// AdminCreateUserRequest body for POST /api/admin/users
type AdminCreateUserRequest struct {
	Email     string `json:"email" validate:"required,email"`
	FirstName string `json:"first_name" validate:"required,max=100"`
	LastName  string `json:"last_name" validate:"required,max=100"`
	Role      string `json:"role" validate:"required,oneof=admin manager user validator archivist"`
}

type AdminCreateUserResponse struct {
	User      UserResponse `json:"user"`
	EmailSent bool         `json:"email_sent"`
}

// AdminUpdateUserRequest body for PUT /api/admin/users/:id
type AdminUpdateUserRequest struct {
	FirstName *string `json:"first_name" validate:"omitempty,max=100"`
	LastName  *string `json:"last_name" validate:"omitempty,max=100"`
	Role      *string `json:"role" validate:"omitempty,oneof=admin manager user validator archivist"`
	IsActive  *bool   `json:"is_active"`
}

// AdminUserDetailResponse fiche admin (incl. Cells)
type AdminUserDetailResponse struct {
	UserResponse
	PydioUserID string `json:"pydio_user_id,omitempty"`
}

// AdminUserActionResponse resend-credentials / sync-pydio
type AdminUserActionResponse struct {
	User      AdminUserDetailResponse `json:"user"`
	EmailSent bool                    `json:"email_sent,omitempty"`
}
