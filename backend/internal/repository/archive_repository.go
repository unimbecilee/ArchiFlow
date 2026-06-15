package repository

import (
	"archiflow/backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ArchiveRepository struct {
	db *gorm.DB
}

func NewArchiveRepository(db *gorm.DB) *ArchiveRepository {
	return &ArchiveRepository{db: db}
}

func (r *ArchiveRepository) CreateArchiveRequest(req *models.ArchiveRequest) error {
	return r.db.Create(req).Error
}

func (r *ArchiveRepository) ListArchiveRequests(limit int) ([]models.ArchiveRequest, error) {
	var rows []models.ArchiveRequest
	q := r.db.Order("created_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	return rows, q.Find(&rows).Error
}

func (r *ArchiveRepository) CreatePydioArchiveRequest(req *models.PydioArchiveRequest) error {
	return r.db.Create(req).Error
}

func (r *ArchiveRepository) ListPydioArchiveRequests(limit int) ([]models.PydioArchiveRequest, error) {
	var rows []models.PydioArchiveRequest
	q := r.db.Order("created_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	return rows, q.Find(&rows).Error
}

func (r *ArchiveRepository) CreateWebhookLog(log *models.PydioWebhookLog) error {
	return r.db.Create(log).Error
}

func (r *ArchiveRepository) CountPydioArchiveRequests() (int64, error) {
	var n int64
	err := r.db.Model(&models.PydioArchiveRequest{}).Count(&n).Error
	return n, err
}

func (r *ArchiveRepository) GetPydioArchiveRequest(id uuid.UUID) (*models.PydioArchiveRequest, error) {
	var row models.PydioArchiveRequest
	if err := r.db.First(&row, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}
