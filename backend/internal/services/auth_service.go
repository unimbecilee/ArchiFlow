package services

import (
	"context"
	"errors"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/utils"
)

type AuthService interface {
	Register(req dto.RegisterRequest, meta SessionMeta) (*dto.RegisterResponse, error)
	Login(req dto.LoginRequest, meta SessionMeta) (*dto.LoginResponse, error)
	RefreshToken(refreshToken string, meta SessionMeta) (*dto.RefreshResponse, error)
	Logout(userID uint, refreshToken string) error
	RevokeRefreshSession(refreshToken string) error
	GetMe(userID uint) (*dto.UserResponse, error)
	UpdateProfile(userID uint, req dto.UpdateProfileRequest) (*dto.UserResponse, error)
	ChangePassword(userID uint, req dto.ChangePasswordRequest) error
}

type authService struct {
	userRepo  repository.UserRepository
	jwtUtil   *utils.JWTUtil
	sessions  *SessionService
	pydioSync *UserPydioSync
	sftpSync  *UserSftpGoSync
}

func NewAuthService(
	userRepo repository.UserRepository,
	jwtUtil *utils.JWTUtil,
	sessions *SessionService,
	pydioSync *UserPydioSync,
	sftpSync *UserSftpGoSync,
) AuthService {
	return &authService{
		userRepo:  userRepo,
		jwtUtil:   jwtUtil,
		sessions:  sessions,
		pydioSync: pydioSync,
		sftpSync:  sftpSync,
	}
}

func (s *authService) Register(req dto.RegisterRequest, meta SessionMeta) (*dto.RegisterResponse, error) {
	if !config.PublicRegisterAllowed() {
		return nil, errors.New("public registration is disabled")
	}
	_, err := s.userRepo.GetByEmail(req.Email)
	if err == nil {
		return nil, errors.New("email already registered")
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	user := &models.User{
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         "user",
		IsActive:     true,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, errors.New("failed to create user")
	}
	if s.pydioSync != nil {
		if err := s.pydioSync.ProvisionOnCreate(context.Background(), user, req.Password); err != nil {
			s.pydioSync.RollbackCreate(context.Background(), user.Email, user.ID)
			return nil, errors.New("failed to create collaboration account")
		}
	}
	if s.sftpSync != nil {
		_ = s.sftpSync.ProvisionOnCreate(context.Background(), user, req.Password)
	}

	user, _ = s.userRepo.GetByID(user.ID)
	tokenPair, err := s.sessions.IssueTokens(user, meta)
	if err != nil {
		return nil, err
	}

	return &dto.RegisterResponse{
		User:         toUserResponse(user),
		Token:        toPublicToken(tokenPair),
		RefreshToken: tokenPair.RefreshToken,
	}, nil
}

func (s *authService) Login(req dto.LoginRequest, meta SessionMeta) (*dto.LoginResponse, error) {
	user, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if !user.IsActive {
		return nil, errors.New("account is deactivated")
	}

	if !utils.VerifyPassword(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid email or password")
	}

	s.userRepo.UpdateLastLogin(user.ID)

	tokenPair, err := s.sessions.IssueTokens(user, meta)
	if err != nil {
		return nil, errors.New("failed to generate tokens")
	}

	return &dto.LoginResponse{
		User:         toUserResponse(user),
		Token:        toPublicToken(tokenPair),
		RefreshToken: tokenPair.RefreshToken,
	}, nil
}

func (s *authService) RefreshToken(refreshToken string, meta SessionMeta) (*dto.RefreshResponse, error) {
	tokenPair, err := s.sessions.RotateRefresh(refreshToken, meta)
	if err != nil {
		return nil, err
	}
	return &dto.RefreshResponse{
		Token:        toPublicToken(tokenPair),
		RefreshToken: tokenPair.RefreshToken,
	}, nil
}

func (s *authService) Logout(userID uint, refreshToken string) error {
	_ = userID
	if refreshToken != "" {
		return s.sessions.RevokeRefresh(refreshToken)
	}
	return nil
}

func (s *authService) RevokeRefreshSession(refreshToken string) error {
	return s.sessions.RevokeRefresh(refreshToken)
}

func (s *authService) GetMe(userID uint) (*dto.UserResponse, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	userResp := toUserResponse(user)
	return &userResp, nil
}

func (s *authService) UpdateProfile(userID uint, req dto.UpdateProfileRequest) (*dto.UserResponse, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, errors.New("failed to update profile")
	}

	userResp := toUserResponse(user)
	return &userResp, nil
}

func (s *authService) ChangePassword(userID uint, req dto.ChangePasswordRequest) error {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return errors.New("user not found")
	}

	if !user.MustChangePassword {
		if req.CurrentPassword == "" {
			return errors.New("current password is required")
		}
		if !utils.VerifyPassword(req.CurrentPassword, user.PasswordHash) {
			return errors.New("current password is incorrect")
		}
	}

	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return errors.New("failed to hash password")
	}

	if s.pydioSync != nil {
		if err := s.pydioSync.UpdatePassword(context.Background(), user, req.NewPassword); err != nil {
			return errors.New("failed to update collaboration password: " + err.Error())
		}
	}

	user.PasswordHash = hashedPassword
	user.MustChangePassword = false
	if err := s.userRepo.Update(user); err != nil {
		return errors.New("failed to update password")
	}

	return s.sessions.InvalidateUser(userID)
}

func toUserResponse(user *models.User) dto.UserResponse {
	if user == nil {
		return dto.UserResponse{}
	}
	return dto.UserResponse{
		ID:                 user.ID,
		Email:              user.Email,
		FirstName:          user.FirstName,
		LastName:           user.LastName,
		Role:               user.Role,
		AvatarURL:          user.AvatarURL,
		Department:         user.Department,
		ClearanceLevel:     user.ClearanceLevel,
		SftpEnabled:        user.SftpEnabled,
		SftpMode:           user.SftpMode,
		IsActive:           user.IsActive,
		MustChangePassword: user.MustChangePassword,
		PydioLinked:        user.PydioPasswordEnc != "",
		LastLoginAt:        user.LastLoginAt,
		CreatedAt:          user.CreatedAt,
		Capabilities:       models.CapabilitiesForRole(user.Role),
	}
}

func toPublicToken(pair *utils.TokenPair) dto.PublicTokenResponse {
	return dto.PublicTokenResponse{
		AccessToken: pair.AccessToken,
		ExpiresIn:   pair.ExpiresIn,
	}
}
