package repository

import (
	"time"

	"archiflow/backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UploadRepository struct {
	db *gorm.DB
}

func NewUploadRepository(db *gorm.DB) *UploadRepository {
	return &UploadRepository{db: db}
}

func (r *UploadRepository) CreateSession(s *models.UploadSession) error {
	return r.db.Create(s).Error
}

func (r *UploadRepository) FindSessionByID(id uuid.UUID) (*models.UploadSession, error) {
	var s models.UploadSession
	err := r.db.Preload("Parts").First(&s, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *UploadRepository) FindActiveByUserAndHash(userID uint, sha256 string) (*models.UploadSession, error) {
	var s models.UploadSession
	err := r.db.Preload("Parts").
		Where("user_id = ? AND file_sha256 = ? AND status IN ?", userID, sha256,
			[]string{models.UploadStatusPending, models.UploadStatusUploading}).
		Order("created_at DESC").
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *UploadRepository) UpdateSession(s *models.UploadSession) error {
	return r.db.Save(s).Error
}

func (r *UploadRepository) UpsertPart(p *models.UploadPart) error {
	var existing models.UploadPart
	err := r.db.Where("session_id = ? AND part_number = ?", p.SessionID, p.PartNumber).First(&existing).Error
	if err == gorm.ErrRecordNotFound {
		return r.db.Create(p).Error
	}
	if err != nil {
		return err
	}
	existing.ETag = p.ETag
	existing.Size = p.Size
	existing.Status = p.Status
	return r.db.Save(&existing).Error
}

func (r *UploadRepository) CountActiveByUser(userID uint) (int64, error) {
	var n int64
	err := r.db.Model(&models.UploadSession{}).
		Where("user_id = ? AND status IN ?", userID,
			[]string{models.UploadStatusPending, models.UploadStatusUploading, models.UploadStatusCompleting}).
		Count(&n).Error
	return n, err
}

// SumActiveBytesByUser totals file_size for in-flight upload sessions (quota reservation).
func (r *UploadRepository) SumActiveBytesByUser(userID uint) (int64, error) {
	var total int64
	err := r.db.Model(&models.UploadSession{}).
		Where("user_id = ? AND status IN ?", userID,
			[]string{models.UploadStatusPending, models.UploadStatusUploading, models.UploadStatusCompleting}).
		Select("COALESCE(SUM(file_size), 0)").
		Scan(&total).Error
	return total, err
}

// ListStaleActive returns active sessions idle since inactiveBefore (no progress expected).
func (r *UploadRepository) ListStaleActive(userID uint, inactiveBefore time.Time, limit int) ([]models.UploadSession, error) {
	if limit <= 0 {
		limit = 50
	}
	var rows []models.UploadSession
	err := r.db.Where(
		"user_id = ? AND status IN ? AND updated_at < ?",
		userID,
		[]string{models.UploadStatusPending, models.UploadStatusUploading, models.UploadStatusCompleting},
		inactiveBefore,
	).Order("updated_at ASC").Limit(limit).Find(&rows).Error
	return rows, err
}

// ListActiveWithoutParts returns active sessions that never uploaded a part (failed client-side).
func (r *UploadRepository) ListActiveWithoutParts(userID uint, limit int) ([]models.UploadSession, error) {
	if limit <= 0 {
		limit = 50
	}
	var rows []models.UploadSession
	err := r.db.Table("upload_sessions").
		Select("upload_sessions.*").
		Joins(`LEFT JOIN upload_parts ON upload_parts.session_id = upload_sessions.id`).
		Where(
			"upload_sessions.user_id = ? AND upload_sessions.status IN ? AND upload_parts.id IS NULL",
			userID,
			[]string{models.UploadStatusPending, models.UploadStatusUploading, models.UploadStatusCompleting},
		).
		Group("upload_sessions.id").
		Order("upload_sessions.created_at ASC").
		Limit(limit).
		Find(&rows).Error
	return rows, err
}

func (r *UploadRepository) ListExpired(before time.Time, limit int) ([]models.UploadSession, error) {
	if limit <= 0 {
		limit = 100
	}
	var rows []models.UploadSession
	err := r.db.Where("expires_at < ? AND status IN ?", before,
		[]string{models.UploadStatusPending, models.UploadStatusUploading, models.UploadStatusFailed}).
		Limit(limit).
		Find(&rows).Error
	return rows, err
}
