package repository

import (
	"context"

	"archiflow/backend/internal/models"

	"gorm.io/gorm"
)

type ShareRepository struct {
	db *gorm.DB
}

func NewShareRepository(db *gorm.DB) *ShareRepository {
	return &ShareRepository{db: db}
}

func (r *ShareRepository) CreateExternalShare(ctx context.Context, share *models.ExternalShare) error {
	return r.db.WithContext(ctx).Create(share).Error
}

func (r *ShareRepository) GetExternalShareByToken(ctx context.Context, token string) (*models.ExternalShare, error) {
	var share models.ExternalShare
	err := r.db.WithContext(ctx).Where("token = ?", token).First(&share).Error
	return &share, err
}

func (r *ShareRepository) GetExternalShareByID(ctx context.Context, id uint) (*models.ExternalShare, error) {
	var share models.ExternalShare
	err := r.db.WithContext(ctx).First(&share, id).Error
	return &share, err
}

func (r *ShareRepository) UpdateExternalShare(ctx context.Context, share *models.ExternalShare) error {
	return r.db.WithContext(ctx).Save(share).Error
}

func (r *ShareRepository) ListExternalShares(ctx context.Context, ownerID uint, admin bool) ([]models.ExternalShare, error) {
	var shares []models.ExternalShare
	q := r.db.WithContext(ctx).Where("is_active = ?", true)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	err := q.Order("created_at DESC").Find(&shares).Error
	return shares, err
}

func (r *ShareRepository) CreateShareAccessLog(ctx context.Context, l *models.ShareAccessLog) error {
	return r.db.WithContext(ctx).Create(l).Error
}

func (r *ShareRepository) GetDocumentByID(ctx context.Context, id uint) (*models.Document, error) {
	var doc models.Document
	err := r.db.WithContext(ctx).First(&doc, id).Error
	return &doc, err
}

func (r *ShareRepository) CreateDocumentRecord(ctx context.Context, doc *models.Document) error {
	return r.db.WithContext(ctx).Create(doc).Error
}

func (r *ShareRepository) CreateFileRequest(ctx context.Context, fr *models.FileRequest) error {
	return r.db.WithContext(ctx).Create(fr).Error
}

func (r *ShareRepository) GetFileRequestByToken(ctx context.Context, token string) (*models.FileRequest, error) {
	var fr models.FileRequest
	err := r.db.WithContext(ctx).Where("token = ? AND is_active = ?", token, true).First(&fr).Error
	return &fr, err
}

func (r *ShareRepository) CountUploadsForRequest(ctx context.Context, requestID uint) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.FileRequestUpload{}).Where("file_request_id = ?", requestID).Count(&count).Error
	return count, err
}

func (r *ShareRepository) CreateFileRequestUpload(ctx context.Context, upload *models.FileRequestUpload) error {
	return r.db.WithContext(ctx).Create(upload).Error
}
