package services

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/jobqueue"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
)

type UploadService struct {
	uploadRepo   *repository.UploadRepository
	docRepo      *repository.DocumentRepository
	folderRepo   *repository.FolderRepository
	quota        *UploadQuotaService
	realtime     *NotificationRealtime
	bucket       string
	sessionTTL   time.Duration
}

func NewUploadService(
	uploadRepo *repository.UploadRepository,
	docRepo *repository.DocumentRepository,
	folderRepo *repository.FolderRepository,
	quota *UploadQuotaService,
	realtime *NotificationRealtime,
	bucket string,
) *UploadService {
	if bucket == "" {
		bucket = "archiflow-documents"
	}
	return &UploadService{
		uploadRepo: uploadRepo,
		docRepo:    docRepo,
		folderRepo: folderRepo,
		quota:      quota,
		realtime:   realtime,
		bucket:     bucket,
		sessionTTL: 7 * 24 * time.Hour,
	}
}

type InitUploadInput struct {
	UserID      uint
	IsAdmin     bool
	FileName    string
	FileSize    int64
	ContentType string
	FileSHA256  string
	FolderID    *uint
	Title       string
	Description string
	Category    string
}

func (s *UploadService) InitSession(ctx context.Context, in InitUploadInput) (*dto.InitUploadResponse, error) {
	if err := ValidateResumableUploadMeta(in.FileName, in.ContentType, in.FileSize); err != nil {
		return nil, err
	}
	if err := s.validateFolder(in.FolderID, in.UserID, in.IsAdmin); err != nil {
		return nil, err
	}
	s.cleanupStaleSessions(ctx, in.UserID)
	if err := s.quota.CheckStorage(ctx, in.UserID, in.FileSize); err != nil {
		return nil, err
	}

	sha := strings.TrimSpace(in.FileSHA256)
	if sha != "" {
		if existing, err := s.uploadRepo.FindActiveByUserAndHash(in.UserID, sha); err == nil && existing != nil {
			return s.resumeResponse(ctx, existing)
		}
	}

	if err := s.ensureConcurrentSlot(ctx, in.UserID); err != nil {
		return nil, err
	}
	if sha != "" {
		ok, err := s.quota.TryAcquireUploadLock(ctx, in.UserID, sha)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, errors.New("upload already in progress for this file")
		}
	}

	partSize := config.PartSizeForFile(in.FileSize)
	objectKey := config.NewArchiveObjectName(in.FileName)
	contentType := in.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	uploadID, err := config.NewMultipartUpload(ctx, s.bucket, objectKey, contentType)
	if err != nil {
		if sha != "" {
			s.quota.ReleaseUploadLock(ctx, in.UserID, sha)
		}
		return nil, err
	}

	sessionID := uuid.New()
	expires := time.Now().Add(s.sessionTTL)
	session := &models.UploadSession{
		ID:             sessionID,
		UserID:         in.UserID,
		FileName:       in.FileName,
		FileSize:       in.FileSize,
		ContentType:    contentType,
		FileSHA256:     sha,
		MinioBucket:    s.bucket,
		MinioUploadID:  uploadID,
		MinioObjectKey: objectKey,
		PartSize:       partSize,
		Status:         models.UploadStatusUploading,
		FolderID:       in.FolderID,
		Title:          in.Title,
		Description:    in.Description,
		Category:       in.Category,
		ExpiresAt:      expires,
	}
	if err := s.uploadRepo.CreateSession(session); err != nil {
		_ = config.AbortMultipartUpload(ctx, s.bucket, objectKey, uploadID)
		if sha != "" {
			s.quota.ReleaseUploadLock(ctx, in.UserID, sha)
		}
		return nil, err
	}
	RecordUploadInit()

	return &dto.InitUploadResponse{
		SessionID:     sessionID,
		MinioUploadID: uploadID,
		ObjectKey:     objectKey,
		PartSize:      partSize,
		TotalParts:    config.TotalParts(in.FileSize, partSize),
		ExpiresAt:     expires.UTC().Format(time.RFC3339),
		Resumed:       false,
	}, nil
}

func (s *UploadService) resumeResponse(ctx context.Context, session *models.UploadSession) (*dto.InitUploadResponse, error) {
	completed, err := s.mergeParts(ctx, session)
	if err != nil {
		return nil, err
	}
	nums := make([]int, 0, len(completed))
	for _, p := range completed {
		nums = append(nums, p.PartNumber)
	}
	sort.Ints(nums)
	return &dto.InitUploadResponse{
		SessionID:      session.ID,
		MinioUploadID:  session.MinioUploadID,
		ObjectKey:      session.MinioObjectKey,
		PartSize:       session.PartSize,
		TotalParts:     config.TotalParts(session.FileSize, session.PartSize),
		ExpiresAt:      session.ExpiresAt.UTC().Format(time.RFC3339),
		Resumed:        true,
		CompletedParts: nums,
	}, nil
}

func (s *UploadService) GetStatus(ctx context.Context, sessionID uuid.UUID, userID uint) (*dto.UploadSessionStatusResponse, error) {
	session, err := s.loadOwnedSession(sessionID, userID)
	if err != nil {
		return nil, err
	}
	completed, err := s.mergeParts(ctx, session)
	if err != nil {
		return nil, err
	}
	return &dto.UploadSessionStatusResponse{
		SessionID:      session.ID,
		Status:         session.Status,
		FileName:       session.FileName,
		FileSize:       session.FileSize,
		PartSize:       session.PartSize,
		TotalParts:     config.TotalParts(session.FileSize, session.PartSize),
		CompletedParts: completed,
		DocumentID:     session.DocumentID,
		ErrorMessage:   session.ErrorMessage,
	}, nil
}

func (s *UploadService) PresignPart(ctx context.Context, sessionID uuid.UUID, userID uint, partNumber int) (*dto.UploadPartURLResponse, error) {
	session, err := s.loadOwnedSession(sessionID, userID)
	if err != nil {
		return nil, err
	}
	if session.Status == models.UploadStatusCompleted || session.Status == models.UploadStatusAborted {
		return nil, fmt.Errorf("session is %s", session.Status)
	}
	total := config.TotalParts(session.FileSize, session.PartSize)
	if partNumber < 1 || partNumber > total {
		return nil, fmt.Errorf("invalid part number")
	}
	url, err := config.PresignUploadPart(ctx, session.MinioBucket, session.MinioObjectKey, session.MinioUploadID, partNumber)
	if err != nil {
		return nil, err
	}
	ttl := int(config.PresignedPartURLTTL().Seconds())
	return &dto.UploadPartURLResponse{
		PartNumber: partNumber,
		URL:        url,
		ExpiresIn:  ttl,
	}, nil
}

func (s *UploadService) Complete(ctx context.Context, sessionID uuid.UUID, userID uint, parts []dto.CompletePartInput) (*dto.CompleteUploadResponse, error) {
	session, err := s.loadOwnedSession(sessionID, userID)
	if err != nil {
		return nil, err
	}
	if session.Status == models.UploadStatusCompleted {
		if session.DocumentID != nil {
			return &dto.CompleteUploadResponse{
				DocumentID: *session.DocumentID,
				Title:      session.Title,
				Status:     session.Status,
			}, nil
		}
		return nil, fmt.Errorf("session already completed without document")
	}
	if session.Status == models.UploadStatusAborted {
		return nil, fmt.Errorf("session aborted")
	}

	session.Status = models.UploadStatusCompleting
	_ = s.uploadRepo.UpdateSession(session)

	minioParts, err := config.ListUploadedParts(ctx, session.MinioBucket, session.MinioObjectKey, session.MinioUploadID)
	if err != nil {
		return nil, err
	}
	merged := mergeMinioAndClientParts(minioParts, parts)
	expected := config.TotalParts(session.FileSize, session.PartSize)
	if len(merged) < expected {
		session.Status = models.UploadStatusUploading
		_ = s.uploadRepo.UpdateSession(session)
		return nil, fmt.Errorf("missing parts: got %d, need %d", len(merged), expected)
	}

	completeParts := make([]minio.CompletePart, 0, len(merged))
	for _, p := range merged {
		completeParts = append(completeParts, minio.CompletePart{
			PartNumber: p.PartNumber,
			ETag:       p.ETag,
		})
		_ = s.uploadRepo.UpsertPart(&models.UploadPart{
			SessionID:  session.ID,
			PartNumber: p.PartNumber,
			ETag:       p.ETag,
			Size:       p.Size,
			Status:     models.UploadPartCompleted,
		})
	}

	_, err = config.CompleteMultipartUpload(ctx, session.MinioBucket, session.MinioObjectKey, session.MinioUploadID, completeParts)
	if err != nil {
		session.Status = models.UploadStatusFailed
		session.ErrorMessage = err.Error()
		_ = s.uploadRepo.UpdateSession(session)
		return nil, err
	}

	title := session.Title
	if title == "" {
		title = session.FileName
	}
	category := session.Category
	if category == "" {
		category = "Document"
	}
	minioURL := fmt.Sprintf("%s/%s/%s", s.bucket, s.bucket, session.MinioObjectKey)

	doc := &models.Document{
		Title:           title,
		Description:     session.Description,
		FileName:        session.FileName,
		MimeType:        session.ContentType,
		Size:            session.FileSize,
		Category:        category,
		MinioBucket:     s.bucket,
		MinioObjectName: session.MinioObjectKey,
		MinioURL:        minioURL,
		OwnerID:         session.UserID,
		FolderID:        session.FolderID,
		CreatedByID:     session.UserID,
		ModifiedByID:    session.UserID,
		Status:          models.DocumentStatusDraft,
		Classification:  models.ClassificationInternal,
		ContentSHA256:   session.FileSHA256,
	}
	if err := s.docRepo.Create(doc); err != nil {
		session.Status = models.UploadStatusFailed
		session.ErrorMessage = err.Error()
		_ = s.uploadRepo.UpdateSession(session)
		return nil, err
	}

	session.Status = models.UploadStatusCompleted
	session.DocumentID = &doc.ID
	session.ErrorMessage = ""
	if err := s.uploadRepo.UpdateSession(session); err != nil {
		return nil, err
	}
	s.quota.ReleaseUploadLock(ctx, session.UserID, session.FileSHA256)
	RecordUploadComplete()
	jobqueue.EnqueueAfterUpload(ctx, doc)

	if s.realtime != nil {
		s.realtime.PublishDocumentEvent(session.UserID, "upload_completed", doc.ID, doc.Title)
	}

	return &dto.CompleteUploadResponse{
		DocumentID: doc.ID,
		Title:      doc.Title,
		Status:     session.Status,
	}, nil
}

func (s *UploadService) Abort(ctx context.Context, sessionID uuid.UUID, userID uint) error {
	session, err := s.loadOwnedSession(sessionID, userID)
	if err != nil {
		return err
	}
	if session.Status == models.UploadStatusCompleted {
		return fmt.Errorf("cannot abort completed session")
	}
	_ = config.AbortMultipartUpload(ctx, session.MinioBucket, session.MinioObjectKey, session.MinioUploadID)
	session.Status = models.UploadStatusAborted
	_ = s.uploadRepo.UpdateSession(session)
	s.quota.ReleaseUploadLock(ctx, session.UserID, session.FileSHA256)
	RecordUploadAbort()
	return nil
}

func (s *UploadService) ensureConcurrentSlot(ctx context.Context, userID uint) error {
	if err := s.quota.CheckConcurrent(ctx, userID); err == nil {
		return nil
	}
	s.cleanupStaleSessions(ctx, userID)
	return s.quota.CheckConcurrent(ctx, userID)
}

// cleanupStaleSessions aborts abandoned MPU sessions (failed client uploads, idle transfers).
func (s *UploadService) cleanupStaleSessions(ctx context.Context, userID uint) {
	now := time.Now()
	cutoffIdle := now.Add(-15 * time.Minute)
	seen := map[uuid.UUID]struct{}{}
	abort := func(session models.UploadSession) {
		if _, ok := seen[session.ID]; ok {
			return
		}
		seen[session.ID] = struct{}{}
		_ = s.Abort(ctx, session.ID, userID)
	}
	if rows, err := s.uploadRepo.ListActiveWithoutParts(userID, 50); err == nil {
		for _, row := range rows {
			abort(row)
		}
	}
	if rows, err := s.uploadRepo.ListStaleActive(userID, cutoffIdle, 50); err == nil {
		for _, row := range rows {
			abort(row)
		}
	}
}

// CleanupExpired aborts MPU sessions past expiry (cron).
func (s *UploadService) CleanupExpired(ctx context.Context) (int, error) {
	rows, err := s.uploadRepo.ListExpired(time.Now(), 50)
	if err != nil {
		return 0, err
	}
	n := 0
	for _, row := range rows {
		_ = config.AbortMultipartUpload(ctx, row.MinioBucket, row.MinioObjectKey, row.MinioUploadID)
		row.Status = models.UploadStatusAborted
		row.ErrorMessage = "expired"
		_ = s.uploadRepo.UpdateSession(&row)
		s.quota.ReleaseUploadLock(ctx, row.UserID, row.FileSHA256)
		n++
	}
	return n, nil
}

func (s *UploadService) loadOwnedSession(id uuid.UUID, userID uint) (*models.UploadSession, error) {
	session, err := s.uploadRepo.FindSessionByID(id)
	if err != nil {
		return nil, fmt.Errorf("session not found")
	}
	if session.UserID != userID {
		return nil, fmt.Errorf("session not found")
	}
	return session, nil
}

func (s *UploadService) validateFolder(folderID *uint, ownerID uint, isAdmin bool) error {
	if folderID == nil {
		return nil
	}
	f, err := s.folderRepo.FindByID(*folderID)
	if err != nil {
		return fmt.Errorf("folder not found")
	}
	if !isAdmin && f.OwnerID != ownerID {
		return errors.New("dossier inaccessible : choisissez un dossier qui vous appartient")
	}
	return nil
}

func (s *UploadService) mergeParts(ctx context.Context, session *models.UploadSession) ([]dto.PartStatus, error) {
	minioParts, err := config.ListUploadedParts(ctx, session.MinioBucket, session.MinioObjectKey, session.MinioUploadID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.PartStatus, 0, len(minioParts))
	seen := map[int]struct{}{}
	for _, p := range minioParts {
		out = append(out, dto.PartStatus{
			PartNumber: p.PartNumber,
			ETag:       strings.Trim(p.ETag, `"`),
			Size:       p.Size,
		})
		seen[p.PartNumber] = struct{}{}
		_ = s.uploadRepo.UpsertPart(&models.UploadPart{
			SessionID:  session.ID,
			PartNumber: p.PartNumber,
			ETag:       strings.Trim(p.ETag, `"`),
			Size:       p.Size,
			Status:     models.UploadPartCompleted,
		})
	}
	for _, p := range session.Parts {
		if _, ok := seen[p.PartNumber]; ok {
			continue
		}
		if p.Status == models.UploadPartCompleted {
			out = append(out, dto.PartStatus{
				PartNumber: p.PartNumber,
				ETag:       p.ETag,
				Size:       p.Size,
			})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].PartNumber < out[j].PartNumber })
	return out, nil
}

type mergedPart struct {
	PartNumber int
	ETag       string
	Size       int64
}

func mergeMinioAndClientParts(minioParts []minio.ObjectPart, clientParts []dto.CompletePartInput) []mergedPart {
	byNum := map[int]mergedPart{}
	for _, p := range minioParts {
		byNum[p.PartNumber] = mergedPart{
			PartNumber: p.PartNumber,
			ETag:       strings.Trim(p.ETag, `"`),
			Size:       p.Size,
		}
	}
	for _, p := range clientParts {
		if p.PartNumber < 1 || p.ETag == "" {
			continue
		}
		if _, ok := byNum[p.PartNumber]; !ok {
			byNum[p.PartNumber] = mergedPart{
				PartNumber: p.PartNumber,
				ETag:       strings.Trim(p.ETag, `"`),
			}
		}
	}
	out := make([]mergedPart, 0, len(byNum))
	for _, p := range byNum {
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].PartNumber < out[j].PartNumber })
	return out
}
