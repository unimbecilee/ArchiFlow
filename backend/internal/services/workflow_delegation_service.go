package services

import (
	"context"
	"time"

	"archiflow/backend/internal/models"
	"gorm.io/gorm"
)

type WorkflowDelegationService struct {
	db *gorm.DB
}

func NewWorkflowDelegationService(db *gorm.DB) *WorkflowDelegationService {
	return &WorkflowDelegationService{db: db}
}

func (s *WorkflowDelegationService) Delegate(ctx context.Context, delegatorID, delegateID uint, start, end time.Time, reason string) (*models.WorkflowDelegation, error) {
	d := &models.WorkflowDelegation{DelegatorID: delegatorID, DelegateID: delegateID, StartAt: start, EndAt: end, Reason: reason}
	return d, s.db.WithContext(ctx).Create(d).Error
}

func (s *WorkflowDelegationService) ResolveDelegate(ctx context.Context, userID uint) (uint, error) {
	var d models.WorkflowDelegation
	err := s.db.WithContext(ctx).Where("delegator_id = ? AND ? BETWEEN start_at AND end_at", userID, time.Now()).First(&d).Error
	if err != nil {
		return userID, nil
	}
	return d.DelegateID, nil
}

func (s *WorkflowDelegationService) ListForUser(ctx context.Context, userID uint) ([]models.WorkflowDelegation, error) {
	var rows []models.WorkflowDelegation
	err := s.db.WithContext(ctx).Where("delegator_id = ? OR delegate_id = ?", userID, userID).Find(&rows).Error
	return rows, err
}
