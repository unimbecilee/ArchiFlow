package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"path"
	"path/filepath"
	"strings"
	"time"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"

	"github.com/google/uuid"
)

var (
	ErrIngestLocked     = errors.New("ingest already in progress")
	ErrIngestValidation = errors.New("document en validation : dépôt SFTP rejeté")
)

type SFTPIngestService struct {
	sftpRepo        *repository.SftpRepository
	docRepo         *repository.DocumentRepository
	userRepo        repository.UserRepository
	audit           *AuditService
	notify          *NotificationRealtime
	documentsBucket string
	inboxBucket     string
	collab          *CollaborationService
}

func NewSFTPIngestService(
	sftpRepo *repository.SftpRepository,
	docRepo *repository.DocumentRepository,
	userRepo repository.UserRepository,
	audit *AuditService,
	notify *NotificationRealtime,
	documentsBucket, inboxBucket string,
	collab *CollaborationService,
) *SFTPIngestService {
	if documentsBucket == "" {
		documentsBucket = "archiflow-documents"
	}
	if inboxBucket == "" {
		inboxBucket = "archiflow-sftp-inbox"
	}
	return &SFTPIngestService{
		sftpRepo:        sftpRepo,
		docRepo:         docRepo,
		userRepo:        userRepo,
		audit:           audit,
		notify:          notify,
		documentsBucket: documentsBucket,
		inboxBucket:     inboxBucket,
		collab:          collab,
	}
}

type SftpHookPayload struct {
	Action      string `json:"action" validate:"required,max=64"`
	Username    string `json:"username" validate:"omitempty,max=255"`
	Path        string `json:"path" validate:"omitempty,max=2048"`
	VirtualPath string `json:"virtual_path" validate:"omitempty,max=2048"`
	FilePath    string `json:"file_path" validate:"omitempty,max=2048"`
	FileSize    int64  `json:"file_size" validate:"omitempty,gte=0"`
	Protocol    string `json:"protocol" validate:"omitempty,max=32"`
	IP          string `json:"ip" validate:"omitempty,max=64"`
	Status      int    `json:"status"`
	FsProvider  int    `json:"fs_provider"`
	Bucket      string `json:"bucket" validate:"omitempty,max=255"`
	Endpoint    string `json:"endpoint" validate:"omitempty,max=512"`
}

func (s *SFTPIngestService) ResolveOwnerID(username string) (uint, error) {
	username = strings.ToLower(strings.TrimSpace(username))
	if username == "" {
		return 0, fmt.Errorf("empty username")
	}
	if sa, err := s.sftpRepo.FindServiceAccountBySftpUser(username); err == nil && sa != nil {
		return sa.ArchiflowUserID, nil
	}
	user, err := s.userRepo.GetByEmail(username)
	if err != nil {
		return 0, fmt.Errorf("user not found")
	}
	return user.ID, nil
}

func (s *SFTPIngestService) IngestUpload(ctx context.Context, hook SftpHookPayload, correlationID string) (*models.Document, error) {
	ownerID, err := s.ResolveOwnerID(hook.Username)
	if err != nil {
		return nil, err
	}

	stagingKey := strings.TrimPrefix(hook.Path, "/")
	if stagingKey == "" {
		stagingKey = strings.TrimPrefix(hook.FilePath, "/")
	}
	if stagingKey == "" {
		return nil, fmt.Errorf("empty staging key")
	}

	stagingBucket := hook.Bucket
	if stagingBucket == "" {
		stagingBucket = s.inboxBucket
	}

	fileName := filepath.Base(hook.VirtualPath)
	if fileName == "" || fileName == "." {
		fileName = filepath.Base(stagingKey)
	}

	folderID := ParseFolderIDFromVirtualPath(hook.VirtualPath)
	directDocuments := stagingBucket == s.documentsBucket ||
		strings.EqualFold(stagingBucket, s.documentsBucket)

	// Bloque si un document homonyme est EN_VALIDATION ou verrouillé
	if blocked, _ := s.docRepo.OwnerHasLockedOrValidatingFile(ownerID, fileName); blocked {
		if s.audit != nil {
			_ = s.audit.Log(models.AuditEvent{
				Source: "sftpgo", ActorID: &ownerID, ActorEmail: hook.Username,
				Action: "sftp.upload.rejected", ResourceType: "document",
				IP: hook.IP, CorrelationID: correlationID,
				Metadata: fmt.Sprintf(`{"reason":"en_validation_or_locked","file":%q}`, fileName),
			})
		}
		return nil, ErrIngestValidation
	}

	idem := hashIdempotency(ownerID, stagingBucket, stagingKey, hook.FileSize)
	if existing, err := s.sftpRepo.FindIngestByIdempotency(idem); err == nil && existing != nil {
		if existing.Status == models.SftpIngestIngested && existing.DocumentID != nil {
			return s.docRepo.FindByID(*existing.DocumentID)
		}
		if existing.Status != models.SftpIngestPending && existing.Status != models.SftpIngestFailed {
			return nil, fmt.Errorf("already processed")
		}
	}

	unlock, ok := acquireIngestLock(ctx, stagingKey)
	if !ok {
		return nil, ErrIngestLocked
	}
	defer unlock()

	event := &models.SftpIngestEvent{
		OwnerID:        ownerID,
		StagingBucket:  stagingBucket,
		StagingKey:     stagingKey,
		Status:         models.SftpIngestPending,
		SourceProtocol: hook.Protocol,
		FileName:       fileName,
		Size:           hook.FileSize,
		IdempotencyKey: idem,
		CorrelationID:  correlationID,
	}
	if err := s.sftpRepo.CreateIngestEvent(event); err != nil {
		if existing, e2 := s.sftpRepo.FindIngestByIdempotency(idem); e2 == nil && existing.DocumentID != nil {
			return s.docRepo.FindByID(*existing.DocumentID)
		}
		return nil, err
	}

	size, contentType, err := config.StatObject(ctx, stagingBucket, stagingKey)
	if err != nil {
		event.Status = models.SftpIngestFailed
		event.ErrorMessage = err.Error()
		_ = s.sftpRepo.UpdateIngestEvent(event)
		return nil, fmt.Errorf("stat staging: %w", err)
	}
	if size == 0 && hook.FileSize > 0 {
		size = hook.FileSize
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	canonicalBucket := s.documentsBucket
	canonicalKey := stagingKey
	if !directDocuments {
		canonicalKey = config.NewArchiveObjectName(fileName)
		if err := config.CopyObject(ctx, stagingBucket, stagingKey, s.documentsBucket, canonicalKey); err != nil {
			event.Status = models.SftpIngestFailed
			event.ErrorMessage = err.Error()
			_ = s.sftpRepo.UpdateIngestEvent(event)
			return nil, fmt.Errorf("copy to canonical: %w", err)
		}
	}

	user, _ := s.userRepo.GetByID(ownerID)
	dept := ""
	classif := models.ClassificationInternal
	if user != nil {
		dept = user.Department
		if user.ClearanceLevel != "" {
			classif = user.ClearanceLevel
		}
	}

	category := "SFTP"
	if directDocuments {
		category = "Upload"
	}

	doc := &models.Document{
		Title:           strings.TrimSuffix(fileName, filepath.Ext(fileName)),
		Description:     "Imported via SFTPGo",
		FileName:        fileName,
		MimeType:        contentType,
		Size:            size,
		Category:        category,
		MinioBucket:     canonicalBucket,
		MinioObjectName: canonicalKey,
		MinioURL:        fmt.Sprintf("%s/%s/%s", canonicalBucket, canonicalBucket, canonicalKey),
		OwnerID:         ownerID,
		FolderID:        folderID,
		CreatedByID:     ownerID,
		ModifiedByID:    ownerID,
		Status:          models.DocumentStatusDraft,
		Classification:  classif,
		Department:      dept,
	}
	if err := s.docRepo.Create(doc); err != nil {
		event.Status = models.SftpIngestFailed
		event.ErrorMessage = err.Error()
		_ = s.sftpRepo.UpdateIngestEvent(event)
		return nil, err
	}

	event.Status = models.SftpIngestIngested
	event.CanonicalBucket = canonicalBucket
	event.CanonicalKey = canonicalKey
	event.DocumentID = &doc.ID
	event.Size = size
	event.MimeType = contentType
	_ = s.sftpRepo.UpdateIngestEvent(event)

	if s.audit != nil {
		_ = s.audit.Log(models.AuditEvent{
			Source:        "sftpgo",
			ActorID:       &ownerID,
			ActorEmail:    hook.Username,
			Action:        "sftp.upload.ingested",
			ResourceType:  "document",
			ResourceID:    fmt.Sprintf("%d", doc.ID),
			IP:            hook.IP,
			CorrelationID: correlationID,
			Metadata:      fmt.Sprintf(`{"staging":%q,"canonical":%q,"folder_id":%v}`, stagingKey, canonicalKey, folderID),
		})
	}

	if s.collab != nil {
		_ = s.collab.notifyUser(
			ownerID,
			"SFTP_INGEST",
			"Document importé",
			fmt.Sprintf("« %s » a été importé", fileName),
			fmt.Sprintf("/documents/%d", doc.ID),
		)
	}
	if s.notify != nil {
		s.notify.PublishDocumentEvent(ownerID, "upload_completed", doc.ID, fileName)
	}

	return doc, nil
}

func (s *SFTPIngestService) StagingObjectPrefix(userID uint) string {
	return path.Join("users", fmt.Sprintf("%d", userID))
}

func hashIdempotency(ownerID uint, bucket, key string, size int64) string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%d|%s|%s|%d", ownerID, bucket, key, size)))
	return hex.EncodeToString(h[:])
}

func NewCorrelationID() string {
	return uuid.New().String()
}

func acquireIngestLock(ctx context.Context, stagingKey string) (unlock func(), ok bool) {
	rdb := config.RedisClient()
	key := "ingest:" + stagingKey
	noop := func() {}
	if rdb == nil {
		return noop, true
	}
	acquired, err := rdb.SetNX(ctx, key, "1", 2*time.Minute).Result()
	if err != nil || !acquired {
		return noop, false
	}
	return func() { _ = rdb.Del(context.Background(), key).Err() }, true
}
