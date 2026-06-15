package repository

import (
	"time"

	"archiflow/backend/internal/models"

	"gorm.io/gorm"
)

type RefreshTokenRepository interface {
	Create(token *models.UserRefreshToken) error
	GetActiveByHash(hash string) (*models.UserRefreshToken, error)
	GetByHash(hash string) (*models.UserRefreshToken, error)
	RevokeByID(id string) error
	RevokeFamily(familyID string) error
	RevokeAllForUser(userID uint) error
	CountActiveForUser(userID uint) (int64, error)
	RevokeOldestActiveForUser(userID uint, keep int) error
	DeleteExpired(before time.Time) (int64, error)
}

type refreshTokenRepository struct {
	db *gorm.DB
}

func NewRefreshTokenRepository(db *gorm.DB) RefreshTokenRepository {
	return &refreshTokenRepository{db: db}
}

func (r *refreshTokenRepository) Create(token *models.UserRefreshToken) error {
	return r.db.Create(token).Error
}

func (r *refreshTokenRepository) GetActiveByHash(hash string) (*models.UserRefreshToken, error) {
	var row models.UserRefreshToken
	err := r.db.Where(
		"token_hash = ? AND revoked_at IS NULL AND expires_at > ?",
		hash, time.Now(),
	).First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *refreshTokenRepository) GetByHash(hash string) (*models.UserRefreshToken, error) {
	var row models.UserRefreshToken
	err := r.db.Where("token_hash = ?", hash).First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *refreshTokenRepository) RevokeByID(id string) error {
	now := time.Now()
	return r.db.Model(&models.UserRefreshToken{}).Where("id = ? AND revoked_at IS NULL", id).
		Update("revoked_at", now).Error
}

func (r *refreshTokenRepository) RevokeFamily(familyID string) error {
	now := time.Now()
	return r.db.Model(&models.UserRefreshToken{}).
		Where("family_id = ? AND revoked_at IS NULL", familyID).
		Update("revoked_at", now).Error
}

func (r *refreshTokenRepository) RevokeAllForUser(userID uint) error {
	now := time.Now()
	return r.db.Model(&models.UserRefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", now).Error
}

func (r *refreshTokenRepository) CountActiveForUser(userID uint) (int64, error) {
	var n int64
	err := r.db.Model(&models.UserRefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL AND expires_at > ?", userID, time.Now()).
		Count(&n).Error
	return n, err
}

func (r *refreshTokenRepository) RevokeOldestActiveForUser(userID uint, keep int) error {
	if keep <= 0 {
		return nil
	}
	var ids []string
	sub := r.db.Model(&models.UserRefreshToken{}).
		Select("id").
		Where("user_id = ? AND revoked_at IS NULL AND expires_at > ?", userID, time.Now()).
		Order("last_used_at DESC")
	var all []string
	if err := sub.Pluck("id", &all).Error; err != nil {
		return err
	}
	if len(all) <= keep {
		return nil
	}
	ids = all[keep:]
	now := time.Now()
	return r.db.Model(&models.UserRefreshToken{}).Where("id IN ?", ids).Update("revoked_at", now).Error
}

func (r *refreshTokenRepository) DeleteExpired(before time.Time) (int64, error) {
	res := r.db.Where("expires_at < ?", before).Delete(&models.UserRefreshToken{})
	return res.RowsAffected, res.Error
}
