package services

import (
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
)

// AuditService journal unifié API + SFTPGo.
type AuditService struct {
	repo *repository.SftpRepository
}

func NewAuditService(repo *repository.SftpRepository) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) Log(e models.AuditEvent) error {
	if s == nil || s.repo == nil {
		return nil
	}
	return s.repo.CreateAudit(&e)
}
