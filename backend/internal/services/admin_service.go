package services

import (
	"context"
	"errors"
	"os"
	"strings"

	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/utils"
)

type AdminService struct {
	users     repository.UserRepository
	pydioSync *UserPydioSync
	sftpSync  *UserSftpGoSync
	email     *EmailService
	sessions  *SessionService
}

func NewAdminService(
	users repository.UserRepository,
	pydioSync *UserPydioSync,
	sftpSync *UserSftpGoSync,
	email *EmailService,
	sessions *SessionService,
) *AdminService {
	return &AdminService{users: users, pydioSync: pydioSync, sftpSync: sftpSync, email: email, sessions: sessions}
}

func (s *AdminService) ListUsers(limit, offset int) ([]models.User, error) {
	if limit <= 0 {
		limit = 100
	}
	return s.users.ListAll(limit, offset)
}

func (s *AdminService) CreateUser(req dto.AdminCreateUserRequest) (*dto.AdminCreateUserResponse, error) {
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" {
		return nil, errors.New("email required")
	}
	role := strings.TrimSpace(req.Role)
	if role == "" {
		role = "user"
	}
	switch role {
	case models.RoleAdmin, models.RoleUser, models.RoleManager, models.RoleValidator, models.RoleArchivist:
	default:
		return nil, errors.New("invalid role")
	}

	if _, err := s.users.GetByEmail(email); err == nil {
		return nil, errors.New("cet e-mail est deja utilise")
	}

	tempPassword, err := utils.GenerateRandomPassword(14)
	if err != nil {
		return nil, errors.New("failed to generate password")
	}
	hash, err := utils.HashPassword(tempPassword)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	user := &models.User{
		Email:              email,
		PasswordHash:       hash,
		FirstName:          strings.TrimSpace(req.FirstName),
		LastName:           strings.TrimSpace(req.LastName),
		Role:               role,
		IsActive:           true,
		MustChangePassword: true,
	}
	models.ApplyDefaultSftpIfUnset(user, role, nil, nil)

	if err := s.users.Create(user); err != nil {
		return nil, errors.New("failed to create user")
	}

	ctx := context.Background()
	if s.pydioSync != nil {
		if err := s.pydioSync.ProvisionOnCreate(ctx, user, tempPassword); err != nil {
			s.pydioSync.RollbackCreate(ctx, user.Email, user.ID)
			return nil, errors.New("failed to create pydio account: " + err.Error())
		}
	}
	if s.sftpSync != nil && user.SftpEnabled {
		_ = s.sftpSync.ProvisionOnCreate(ctx, user, tempPassword)
	}

	loginURL := os.Getenv("FRONTEND_URL")
	if loginURL == "" {
		loginURL = "http://localhost:3000/login"
	}
	emailSent := false
	if s.email != nil && s.email.Enabled() {
		emailSent = true
		to, fn, pwd, url := email, user.FirstName, tempPassword, loginURL
		go func() {
			if !s.email.SendWelcomeCredentials(to, fn, pwd, url) {
				// log only — user already created
			}
		}()
	}

	u, _ := s.users.GetByID(user.ID)
	resp := &dto.AdminCreateUserResponse{
		User:      toUserResponse(u),
		EmailSent: emailSent,
	}
	return resp, nil
}

func (s *AdminService) GetUser(id uint) (*dto.AdminUserDetailResponse, error) {
	u, err := s.users.GetByID(id)
	if err != nil {
		return nil, errors.New("user not found")
	}
	return toAdminUserDetail(u), nil
}

func (s *AdminService) UpdateUser(id uint, req dto.AdminUpdateUserRequest) (*dto.AdminUserDetailResponse, error) {
	u, err := s.users.GetByID(id)
	if err != nil {
		return nil, errors.New("user not found")
	}
	if req.FirstName != nil {
		u.FirstName = strings.TrimSpace(*req.FirstName)
	}
	if req.LastName != nil {
		u.LastName = strings.TrimSpace(*req.LastName)
	}
	if req.Role != nil {
		switch *req.Role {
		case models.RoleAdmin, models.RoleUser, models.RoleManager, models.RoleValidator, models.RoleArchivist:
			u.Role = *req.Role
		default:
			return nil, errors.New("invalid role")
		}
	}
	if req.IsActive != nil {
		wasActive := u.IsActive
		u.IsActive = *req.IsActive
		if wasActive && !*req.IsActive {
			if err := s.sessions.InvalidateUser(u.ID); err != nil {
				return nil, errors.New("failed to invalidate sessions")
			}
		}
	}
	// SFTP policy pilotée uniquement par le rôle.
	en, mode := models.DefaultSftpForRole(u.Role)
	u.SftpEnabled = en
	u.SftpMode = mode
	if err := s.users.Update(u); err != nil {
		return nil, errors.New("failed to update user")
	}
	updated, _ := s.users.GetByID(id)
	return toAdminUserDetail(updated), nil
}

// UpdateUserLegacy PATCH role / is_active only.
func (s *AdminService) UpdateUserLegacy(id uint, role *string, active *bool) (*models.User, error) {
	req := dto.AdminUpdateUserRequest{Role: role, IsActive: active}
	detail, err := s.UpdateUser(id, req)
	if err != nil {
		return nil, err
	}
	return s.users.GetByID(detail.ID)
}

func (s *AdminService) ResendCredentials(id uint) (*dto.AdminUserActionResponse, error) {
	return s.issueTempPassword(id, true)
}

func (s *AdminService) SyncPydio(id uint) (*dto.AdminUserActionResponse, error) {
	return s.issueTempPassword(id, false)
}

func (s *AdminService) issueTempPassword(id uint, sendEmail bool) (*dto.AdminUserActionResponse, error) {
	u, err := s.users.GetByID(id)
	if err != nil {
		return nil, errors.New("user not found")
	}
	tempPassword, err := utils.GenerateRandomPassword(14)
	if err != nil {
		return nil, errors.New("failed to generate password")
	}
	hash, err := utils.HashPassword(tempPassword)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}
	ctx := context.Background()
	if s.pydioSync != nil {
		if err := s.pydioSync.SyncAccount(ctx, u, tempPassword); err != nil {
			return nil, errors.New("failed to sync pydio account: " + err.Error())
		}
	}
	u, _ = s.users.GetByID(id)
	u.PasswordHash = hash
	u.MustChangePassword = true
	if err := s.users.Update(u); err != nil {
		return nil, errors.New("failed to update password")
	}
	if err := s.sessions.InvalidateUser(u.ID); err != nil {
		return nil, errors.New("failed to invalidate sessions")
	}

	emailSent := false
	if sendEmail && s.email != nil && s.email.Enabled() {
		emailSent = true
		loginURL := os.Getenv("FRONTEND_URL")
		if loginURL == "" {
			loginURL = "http://localhost:3000/login"
		}
		to, fn, pwd, url := u.Email, u.FirstName, tempPassword, loginURL
		go func() {
			_ = s.email.SendWelcomeCredentials(to, fn, pwd, url)
		}()
	}

	updated, _ := s.users.GetByID(id)
	return &dto.AdminUserActionResponse{
		User:      *toAdminUserDetail(updated),
		EmailSent: emailSent,
	}, nil
}

func toAdminUserDetail(u *models.User) *dto.AdminUserDetailResponse {
	if u == nil {
		return &dto.AdminUserDetailResponse{}
	}
	resp := toUserResponse(u)
	return &dto.AdminUserDetailResponse{
		UserResponse: resp,
		PydioUserID:  u.PydioUserID,
	}
}

func (s *AdminService) DeleteUser(id uint) error {
	u, err := s.users.GetByID(id)
	if err != nil {
		return errors.New("user not found")
	}
	if s.pydioSync != nil {
		if err := s.pydioSync.DeleteExternal(context.Background(), u.Email); err != nil {
			return err
		}
	}
	if s.sftpSync != nil {
		_ = s.sftpSync.DeleteExternal(context.Background(), u.Email)
	}
	_ = s.sessions.RevokeAllUserSessions(id)
	return s.users.Delete(id)
}

func (s *AdminService) CreateServiceAccount(
	ctx context.Context,
	userID uint,
	name, username, password, description, sftpMode string,
) (*models.ServiceAccount, error) {
	if _, err := s.users.GetByID(userID); err != nil {
		return nil, errors.New("user not found")
	}
	if s.sftpSync == nil {
		return nil, errors.New("sftp sync not configured")
	}
	if name == "" {
		name = username
	}
	return s.sftpSync.CreateServiceAccount(ctx, userID, name, username, password, description, sftpMode)
}

func (s *AdminService) ListServiceAccounts(userID uint) ([]models.ServiceAccount, error) {
	if s.sftpSync == nil {
		return nil, errors.New("sftp sync not configured")
	}
	return s.sftpSync.ListServiceAccounts(userID)
}
