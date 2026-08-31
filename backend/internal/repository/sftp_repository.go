package repository

import (
	"context"
	"errors"

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

const auditChainLockID int64 = 0x5A2D_0001

func (r *SftpRepository) InsertAuditChained(e *models.AuditEvent, computeEntryHash func(prev string) string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", auditChainLockID).Error; err != nil {
			return err
		}
		var prev string
		if err := tx.Model(&models.AuditEvent{}).Select("entry_hash").Order("id DESC").Limit(1).Scan(&prev).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if e.PrevHash == "" {
			e.PrevHash = prev
		}
		e.EntryHash = computeEntryHash(e.PrevHash)
		return tx.Create(e).Error
	})
}

func (r *SftpRepository) AuditChainWalk(ctx context.Context, batchSize int, visit func(models.AuditEvent) error) error {
	if batchSize <= 0 {
		batchSize = 500
	}
	lastID := uint(0)
	for {
		var rows []models.AuditEvent
		err := r.db.WithContext(ctx).Select("id", "source", "actor_id", "actor_email", "action", "resource_type", "resource_id", "ip", "correlation_id", "metadata", "created_at", "prev_hash", "entry_hash").
			Where("id > ?", lastID).Order("id ASC").Limit(batchSize).Find(&rows).Error
		if err != nil {
			return err
		}
		if len(rows) == 0 {
			return nil
		}
		for i := range rows {
			if err := visit(rows[i]); err != nil {
				return err
			}
		}
		lastID = rows[len(rows)-1].ID
	}
}

func (r *SftpRepository) ListAccessPolicies() ([]models.AccessPolicy, error) {
	var rows []models.AccessPolicy
	err := r.db.Where("active = ?", true).Order("priority ASC").Find(&rows).Error
	return rows, err
}

func (r *SftpRepository) ListAllAccessPoliciesAdmin() ([]models.AccessPolicy, error) {
	var rows []models.AccessPolicy
	err := r.db.Order("priority ASC, id ASC").Find(&rows).Error
	return rows, err
}

func (r *SftpRepository) FindAccessPolicyByID(id uint) (*models.AccessPolicy, error) {
	var row models.AccessPolicy
	if err := r.db.First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *SftpRepository) CreateAccessPolicy(p *models.AccessPolicy) error {
	return r.db.Create(p).Error
}

func (r *SftpRepository) UpdateAccessPolicy(p *models.AccessPolicy) error {
	return r.db.Save(p).Error
}

func (r *SftpRepository) DeleteAccessPolicy(id uint) error {
	return r.db.Delete(&models.AccessPolicy{}, id).Error
}
