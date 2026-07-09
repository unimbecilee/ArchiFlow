package repository

import (
	"archiflow/backend/internal/models"

	"gorm.io/gorm"
)

type SftpRepository struct {
	db *gorm.DB
}

func NewSftpRepository(db *gorm.DB) *SftpRepository {
	return &SftpRepository{db: db}
}

func (r *SftpRepository) CreateIngestEvent(e *models.SftpIngestEvent) error {
	return r.db.Create(e).Error
}

func (r *SftpRepository) FindIngestByIdempotency(key string) (*models.SftpIngestEvent, error) {
	var e models.SftpIngestEvent
	err := r.db.Where("idempotency_key = ?", key).First(&e).Error
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *SftpRepository) UpdateIngestEvent(e *models.SftpIngestEvent) error {
	return r.db.Save(e).Error
}

func (r *SftpRepository) CreateServiceAccount(sa *models.ServiceAccount) error {
	return r.db.Create(sa).Error
}

func (r *SftpRepository) UpdateServiceAccount(sa *models.ServiceAccount) error {
	return r.db.Save(sa).Error
}

func (r *SftpRepository) FindServiceAccountBySftpUser(username string) (*models.ServiceAccount, error) {
	var sa models.ServiceAccount
	err := r.db.Where("sftpgo_username = ? AND is_active = ?", username, true).First(&sa).Error
	if err != nil {
		return nil, err
	}
	return &sa, nil
}

func (r *SftpRepository) ListServiceAccounts(userID uint) ([]models.ServiceAccount, error) {
	var rows []models.ServiceAccount
	err := r.db.Where("archiflow_user_id = ?", userID).Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *SftpRepository) CreateAudit(e *models.AuditEvent) error {
	return r.db.Create(e).Error
}

func (r *SftpRepository) ListAccessPolicies() ([]models.AccessPolicy, error) {
	var rows []models.AccessPolicy
	err := r.db.Where("active = ?", true).Order("priority ASC").Find(&rows).Error
	return rows, err
}
