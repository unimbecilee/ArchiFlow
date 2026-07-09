package services

import (
	"context"
	"fmt"
	"path"
	"strconv"
	"strings"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/utils"
)

// UserSftpGoSync provisionne les utilisateurs humains côté SFTPGo (optionnel).
// L'auth humains passe par l'external auth hook ; cette sync prépare le home virtuel.
type UserSftpGoSync struct {
	admin    *SftpGoAdminClient
	userRepo repository.UserRepository
	sftpRepo *repository.SftpRepository
}

func NewUserSftpGoSync(
	admin *SftpGoAdminClient,
	userRepo repository.UserRepository,
	sftpRepo *repository.SftpRepository,
) *UserSftpGoSync {
	return &UserSftpGoSync{admin: admin, userRepo: userRepo, sftpRepo: sftpRepo}
}

func (s *UserSftpGoSync) Enabled() bool {
	return s != nil && s.admin != nil && s.admin.Enabled()
}

func (s *UserSftpGoSync) InboxHome(userID uint) string {
	return path.Join("/users", strconv.FormatUint(uint64(userID), 10))
}

func (s *UserSftpGoSync) ProvisionOnCreate(ctx context.Context, user *models.User, plainPassword string) error {
	if !s.Enabled() {
		return nil
	}
	username := strings.ToLower(strings.TrimSpace(user.Email))
	home := s.InboxHome(user.ID)
	if err := s.admin.EnsureVirtualUser(ctx, username, plainPassword, home); err != nil {
		return err
	}
	user.SftpGoUsername = username
	return s.userRepo.Update(user)
}

func (s *UserSftpGoSync) DeleteExternal(ctx context.Context, email string) error {
	if !s.Enabled() {
		return nil
	}
	return s.admin.DeleteUser(ctx, strings.ToLower(strings.TrimSpace(email)))
}

// CreateServiceAccount crée un compte M2M lié à un user ArchiFlow.
func (s *UserSftpGoSync) CreateServiceAccount(
	ctx context.Context,
	ownerID uint,
	name, username, password, description, sftpMode string,
) (*models.ServiceAccount, error) {
	username = strings.ToLower(strings.TrimSpace(username))
	if username == "" || password == "" {
		return nil, fmt.Errorf("username and password required")
	}
	hash, err := utils.HashPassword(password)
	if err != nil {
		return nil, err
	}
	home := s.InboxHome(ownerID)
	if s.Enabled() {
		if err := s.admin.EnsureVirtualUser(ctx, username, password, home); err != nil {
			// External auth handles login; local SFTPGo user optional
			_ = err
		}
	}
	mode := models.NormalizeSftpMode(sftpMode)
	if mode != models.SftpModeFull {
		mode = models.SftpModeDrop
	}
	sa := &models.ServiceAccount{
		Name:            name,
		ArchiflowUserID: ownerID,
		SftpGoUsername:  username,
		PasswordHash:    hash,
		Description:     description,
		SftpMode:        mode,
		IsActive:        true,
	}
	if err := s.sftpRepo.CreateServiceAccount(sa); err != nil {
		return nil, err
	}
	return sa, nil
}

func (s *UserSftpGoSync) ListServiceAccounts(userID uint) ([]models.ServiceAccount, error) {
	if s.sftpRepo == nil {
		return nil, fmt.Errorf("sftp repo not configured")
	}
	return s.sftpRepo.ListServiceAccounts(userID)
}
