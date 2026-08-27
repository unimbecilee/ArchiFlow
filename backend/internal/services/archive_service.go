package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"path/filepath"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type ArchiveService struct {
	repo          *repository.ArchiveRepository
	archivesBucket string
}

func NewArchiveService(repo *repository.ArchiveRepository, archivesBucket string) *ArchiveService {
	if archivesBucket == "" {
		archivesBucket = "archives-requests"
	}
	return &ArchiveService{repo: repo, archivesBucket: archivesBucket}
}

type CreateArchiveInput struct {
	UserUUID      string
	UserLogin     string
	WorkspaceUUID string
	Nom           string
	Comment       string
	Status        string
	Metadata      map[string]any
	File          *multipart.FileHeader
}

func (s *ArchiveService) CreateFromMultipart(ctx context.Context, in CreateArchiveInput) (*models.ArchiveRequest, error) {
	if in.File == nil {
		return nil, fmt.Errorf("file is required")
	}
	if in.File.Size > MAX_CONTENT_LENGTH {
		return nil, fmt.Errorf("fichier trop volumineux (MAX_CONTENT_LENGTH=%d)", MAX_CONTENT_LENGTH)
	}

	contentType, raw, err := ValidateMultipartFile(in.File)
	if err != nil {
		return nil, err
	}

	objectName := config.NewArchiveObjectName(in.File.Filename)
	filePath, err := config.UploadObject(ctx, s.archivesBucket, objectName, bytes.NewReader(raw), int64(len(raw)), contentType)
	if err != nil {
		return nil, err
	}

	status := in.Status
	if status == "" {
		status = "pending"
	}

	var dataJSON datatypes.JSON
	if len(in.Metadata) > 0 {
		raw, _ := json.Marshal(in.Metadata)
		dataJSON = datatypes.JSON(raw)
	}

	req := &models.ArchiveRequest{
		ID:            uuid.New(),
		UserUUID:      in.UserUUID,
		UserLogin:     in.UserLogin,
		WorkspaceUUID: in.WorkspaceUUID,
		Nom:           in.Nom,
		Comment:       in.Comment,
		Status:        status,
		FilePath:      filePath,
		FileSize:      int64(len(raw)),
		ContentType:   contentType,
		Data:          dataJSON,
	}
	if req.Nom == "" {
		req.Nom = filepath.Base(in.File.Filename)
	}

	if err := s.repo.CreateArchiveRequest(req); err != nil {
		return nil, err
	}
	return req, nil
}

func (s *ArchiveService) List(limit int) ([]models.ArchiveRequest, error) {
	return s.repo.ListArchiveRequests(limit)
}

func (s *ArchiveService) ListPydio(limit int) ([]models.PydioArchiveRequest, error) {
	return s.repo.ListPydioArchiveRequests(limit)
}

type PydioArchiveInput struct {
	DocumentID   string
	DocumentName string
	Workspace    string
	Path         string
	UserLogin    string
	UserEmail    string
	Metadata     map[string]any
}

func (s *ArchiveService) CreatePydioArchiveRequest(in PydioArchiveInput) (*models.PydioArchiveRequest, error) {
	var meta datatypes.JSON
	if len(in.Metadata) > 0 {
		raw, _ := json.Marshal(in.Metadata)
		meta = datatypes.JSON(raw)
	}
	req := &models.PydioArchiveRequest{
		ID:           uuid.New(),
		DocumentID:   in.DocumentID,
		DocumentName: in.DocumentName,
		Workspace:    in.Workspace,
		Path:         in.Path,
		UserLogin:    in.UserLogin,
		UserEmail:    in.UserEmail,
		Status:       "pending",
		Metadata:     meta,
	}
	if err := s.repo.CreatePydioArchiveRequest(req); err != nil {
		return nil, err
	}
	return req, nil
}

func (s *ArchiveService) LogWebhook(event, nodeID, payload string) error {
	return s.repo.CreateWebhookLog(&models.PydioWebhookLog{
		ID:      uuid.New(),
		Event:   event,
		NodeID:  nodeID,
		Payload: payload,
	})
}

func (s *ArchiveService) PydioStats() (map[string]any, error) {
	n, err := s.repo.CountPydioArchiveRequests()
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"archive_requests_total": n,
	}, nil
}
