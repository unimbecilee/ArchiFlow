package services

import (
	"context"
	"time"

	"archiflow/backend/internal/models"
	"gorm.io/gorm"
)

type RetentionService struct {
	db *gorm.DB
}

func NewRetentionService(db *gorm.DB) *RetentionService { return &RetentionService{db: db} }

func (s *RetentionService) CreatePolicy(ctx context.Context, p *models.RetentionPolicy) error {
	return s.db.WithContext(ctx).Create(p).Error
}

func (s *RetentionService) ListPolicies(ctx context.Context) ([]models.RetentionPolicy, error) {
	var rows []models.RetentionPolicy
	err := s.db.WithContext(ctx).Find(&rows).Error
	return rows, err
}

func (s *RetentionService) HoldDocument(ctx context.Context, docID, heldBy uint, reason string) error {
	h := &models.LegalHold{DocumentID: docID, HeldByID: heldBy, Reason: reason, HeldAt: time.Now()}
	return s.db.WithContext(ctx).Create(h).Error
}

func (s *RetentionService) ReleaseHold(ctx context.Context, holdID uint) error {
	now := time.Now()
	return s.db.WithContext(ctx).Model(&models.LegalHold{}).Where("id = ?", holdID).Update("released_at", now).Error
}

func (s *RetentionService) IsOnHold(ctx context.Context, docID uint) (bool, error) {
	var count int64
	err := s.db.WithContext(ctx).Model(&models.LegalHold{}).Where("document_id = ? AND released_at IS NULL", docID).Count(&count).Error
	return count > 0, err
}

func (s *RetentionService) ActiveHold(ctx context.Context, docID uint) (*models.LegalHold, error) {
	var h models.LegalHold
	err := s.db.WithContext(ctx).Where("document_id = ? AND released_at IS NULL", docID).First(&h).Error
	if err != nil {
		return nil, err
	}
	return &h, nil
}

func (s *RetentionService) ListHolds(ctx context.Context, docID uint) ([]models.LegalHold, error) {
	var rows []models.LegalHold
	err := s.db.WithContext(ctx).Where("document_id = ?", docID).Order("held_at DESC").Find(&rows).Error
	return rows, err
}
