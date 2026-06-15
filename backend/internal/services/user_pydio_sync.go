package services

import (
	"context"
	"errors"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/utils"
)

// UserPydioSync lie création / suppression / SSO utilisateurs ArchiFlow ↔ Cells.
type UserPydioSync struct {
	pydio    *PydioIntegrationService
	userRepo repository.UserRepository
}

func NewUserPydioSync(pydio *PydioIntegrationService, userRepo repository.UserRepository) *UserPydioSync {
	return &UserPydioSync{pydio: pydio, userRepo: userRepo}
}

func (s *UserPydioSync) ProvisionOnCreate(ctx context.Context, user *models.User, plainPassword string) error {
	if s.pydio == nil || !s.pydio.Enabled() {
		return nil
	}
	extID, err := s.pydio.ProvisionUser(ctx, user.Email, plainPassword)
	if err != nil {
		return err
	}
	enc, err := utils.EncryptSecret(plainPassword)
	if err != nil {
		_ = s.pydio.DeleteUser(ctx, user.Email)
		return err
	}
	user.PydioUserID = extID
	user.PydioPasswordEnc = enc
	return s.userRepo.Update(user)
}

func (s *UserPydioSync) RollbackCreate(ctx context.Context, email string, userID uint) {
	if s.pydio != nil && s.pydio.Enabled() {
		_ = s.pydio.DeleteUser(ctx, email)
	}
	_ = s.userRepo.Delete(userID)
}

func (s *UserPydioSync) DeleteExternal(ctx context.Context, email string) error {
	if s.pydio == nil || !s.pydio.Enabled() {
		return nil
	}
	return s.pydio.DeleteUser(ctx, email)
}

// SyncAccount provisionne ou met à jour le compte Cells avec le mot de passe fourni.
func (s *UserPydioSync) SyncAccount(ctx context.Context, user *models.User, plainPassword string) error {
	if s.pydio == nil || !s.pydio.Enabled() {
		return nil
	}
	if user.PydioUserID == "" {
		return s.ProvisionOnCreate(ctx, user, plainPassword)
	}
	return s.UpdatePassword(ctx, user, plainPassword)
}

func (s *UserPydioSync) UpdatePassword(ctx context.Context, user *models.User, newPassword string) error {
	if s.pydio == nil || !s.pydio.Enabled() {
		return nil
	}
	if err := s.pydio.UpdateUserPassword(ctx, user.Email, newPassword, user.PydioUserID); err != nil {
		return err
	}
	enc, err := utils.EncryptSecret(newPassword)
	if err != nil {
		return err
	}
	user.PydioPasswordEnc = enc
	return s.userRepo.Update(user)
}

func (s *UserPydioSync) SSOLaunchURL(ctx context.Context, userID uint) (string, error) {
	if s.pydio == nil || !s.pydio.Enabled() {
		return "", errors.New("pydio integration disabled")
	}
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return "", err
	}
	pwd, err := utils.DecryptSecret(user.PydioPasswordEnc)
	if err != nil || pwd == "" {
		return "", errors.New("no pydio account for this user")
	}
	return s.pydio.BuildSSOLaunchURL(ctx, user.Email, pwd)
}
