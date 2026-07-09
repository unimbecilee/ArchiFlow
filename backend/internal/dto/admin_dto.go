package dto

// AdminCreateUserRequest body for POST /api/admin/users
type AdminCreateUserRequest struct {
	Email       string `json:"email"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Role        string `json:"role"`
}

type AdminCreateUserResponse struct {
	User      UserResponse `json:"user"`
	EmailSent bool         `json:"email_sent"`
}

// AdminUpdateUserRequest body for PUT /api/admin/users/:id
type AdminUpdateUserRequest struct {
	FirstName   *string `json:"first_name"`
	LastName    *string `json:"last_name"`
	Role        *string `json:"role"`
	IsActive    *bool   `json:"is_active"`
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
