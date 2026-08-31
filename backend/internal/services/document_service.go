package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/jobqueue"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
)

type DocumentService struct {
	repo            *repository.DocumentRepository
	folderRepo      *repository.FolderRepository
	retention       *RetentionService
	search          *SearchService
	documentsBucket string
}

func NewDocumentService(
	docRepo *repository.DocumentRepository,
	folderRepo *repository.FolderRepository,
	documentsBucket string,
) *DocumentService {
	if documentsBucket == "" {
		documentsBucket = "archiflow-documents"
	}
	return &DocumentService{
		repo:            docRepo,
		folderRepo:      folderRepo,
		documentsBucket: documentsBucket,
	}
}

func (s *DocumentService) SetRetention(r *RetentionService) { s.retention = r }
func (s *DocumentService) SetSearch(search *SearchService)  { s.search = search }

type UploadDocumentInput struct {
	File        *multipart.FileHeader
	Title       string
	Description string
	Category    string
	FolderID    *uint
	OwnerID     uint
	IsAdmin     bool
}

const maxUploadBytes = MAX_CONTENT_LENGTH

func (s *DocumentService) Upload(ctx context.Context, in UploadDocumentInput) (*models.Document, error) {
	if in.File == nil {
		return nil, fmt.Errorf("file is required")
	}
	if in.File.Size > MAX_CONTENT_LENGTH || in.File.Size > maxUploadBytes {
		return nil, fmt.Errorf("fichier trop volumineux (MAX_CONTENT_LENGTH=%d)", MAX_CONTENT_LENGTH)
	}
	if in.FolderID != nil {
		f, err := s.folderRepo.FindByID(*in.FolderID)
		if err != nil {
			return nil, fmt.Errorf("folder not found")
		}
		if !in.IsAdmin && f.OwnerID != in.OwnerID {
			return nil, errors.New("dossier inaccessible : choisissez un dossier qui vous appartient")
		}
	}

	contentType, raw, err := ValidateMultipartFile(in.File)
	if err != nil {
		return nil, err
	}

	objectName := config.NewArchiveObjectName(in.File.Filename)
	_, err = config.UploadObject(ctx, s.documentsBucket, objectName, bytes.NewReader(raw), int64(len(raw)), contentType)
	if err != nil {
		return nil, err
	}

	title := in.Title
	if title == "" {
		title = in.File.Filename
	}
	category := in.Category
	if category == "" {
		category = "Document"
	}

	minioURL := fmt.Sprintf("%s/%s/%s", s.documentsBucket, s.documentsBucket, objectName)

	doc := &models.Document{
		Title:           title,
		Description:     in.Description,
		FileName:        in.File.Filename,
		MimeType:        contentType,
		Size:            int64(len(raw)),
		Category:        category,
		MinioBucket:     s.documentsBucket,
		MinioObjectName: objectName,
		MinioURL:        minioURL,
		OwnerID:         in.OwnerID,
		FolderID:        in.FolderID,
		CreatedByID:     in.OwnerID,
		ModifiedByID:    in.OwnerID,
		Status:          models.DocumentStatusDraft,
		ContentSHA256:   sha256Hex(raw),
	}
	if doc.Classification == "" {
		doc.Classification = models.ClassificationInternal
	}
	if err := s.repo.Create(doc); err != nil {
		return nil, err
	}
	if ocr := ExtractTextFromUpload(in.File.Filename, contentType, bytes.NewReader(raw)); ocr != "" {
		doc.OCRText = ocr
		_ = s.repo.UpdateOCRText(doc.ID, ocr)
	}
	jobqueue.EnqueueAfterUpload(ctx, doc)
	return doc, nil
}

func sha256Hex(raw []byte) string {
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

func (s *DocumentService) ListMy(ownerID uint, isAdmin bool, folderID *uint) ([]models.Document, error) {
	return s.repo.ListByOwner(ownerID, folderID, isAdmin)
}

func (s *DocumentService) ListMyCursor(ownerID uint, isAdmin bool, folderID *uint, limit int, cursor *repository.Cursor) ([]models.Document, *repository.Cursor, error) {
	return s.repo.ListByOwnerCursor(ownerID, folderID, isAdmin, limit, cursor)
}

func (s *DocumentService) ListTrash(ownerID uint, isAdmin bool) ([]models.Document, error) {
	return s.repo.ListTrash(ownerID, isAdmin, 100)
}

func (s *DocumentService) ListTrashCursor(ownerID uint, isAdmin bool, limit int, cursor *repository.Cursor) ([]models.Document, *repository.Cursor, error) {
	return s.repo.ListTrashCursor(ownerID, isAdmin, limit, cursor)
}

func (s *DocumentService) Search(ownerID uint, isAdmin bool, query string, fullText bool) ([]models.Document, error) {
	query = strings.TrimSpace(query)
	if len(query) < 2 {
		return nil, fmt.Errorf("query must be at least 2 characters")
	}
	if s.search != nil {
		docs, _, _, err := s.search.SearchWithFacets(context.Background(), ownerID, isAdmin, query, nil, 50, 0)
		if err == nil {
			return docs, nil
		}
	}
	if fullText {
		rows, err := s.repo.SearchFullText(ownerID, isAdmin, query, 50)
		if err == nil && len(rows) > 0 {
			return rows, nil
		}
	}
	return s.repo.Search(ownerID, isAdmin, query, 50)
}

func (s *DocumentService) SearchFacets(ownerID uint, isAdmin bool, query string, filters map[string]string, limit, offset int) ([]models.Document, int64, map[string]map[string]int64, error) {
	if s.search != nil {
		return s.search.SearchWithFacets(context.Background(), ownerID, isAdmin, query, filters, limit, offset)
	}
	docs, err := s.Search(ownerID, isAdmin, query, true)
	return docs, int64(len(docs)), nil, err
}

func (s *DocumentService) SearchCursor(ownerID uint, isAdmin bool, query string, limit int, cursor *repository.Cursor, fullText bool) ([]models.Document, *repository.Cursor, error) {
	return s.repo.SearchCursor(ownerID, isAdmin, query, limit, cursor, fullText)
}

func (s *DocumentService) ListRecent(ownerID uint, isAdmin bool) ([]models.Document, error) {
	return s.repo.ListRecent(ownerID, isAdmin, 20)
}

func (s *DocumentService) ListRecentCursor(ownerID uint, isAdmin bool, limit int, cursor *repository.Cursor) ([]models.Document, *repository.Cursor, error) {
	return s.repo.ListRecentCursor(ownerID, isAdmin, limit, cursor)
}

func (s *DocumentService) GetByID(id uint) (*models.Document, error) {
	return s.repo.FindByID(id)
}

func (s *DocumentService) UpdateOCRText(id uint, text string) error {
	return s.repo.UpdateOCRText(id, text)
}

func (s *DocumentService) OpenContentByID(ctx context.Context, id uint) (io.ReadCloser, string, string, error) {
	doc, err := s.repo.FindByID(id)
	if err != nil {
		return nil, "", "", err
	}
	obj, err := config.GetObjectStream(ctx, doc.MinioBucket, doc.MinioObjectName)
	if err != nil {
		return nil, "", "", err
	}
	filename := doc.FileName
	if filename == "" {
		filename = doc.Title
	}
	return obj, doc.MimeType, filename, nil
}

func (s *DocumentService) Restore(id, ownerID uint, isAdmin bool) error {
	if s.retention != nil {
		onHold, err := s.retention.IsOnHold(context.Background(), id)
		if err != nil {
			return err
		}
		if onHold {
			return errors.New("document sous conservation légale")
		}
	}
	return s.repo.Restore(id, ownerID, isAdmin)
}

func (s *DocumentService) Lock(id, userID uint, isAdmin bool) error {
	doc, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if !isAdmin && doc.OwnerID != userID {
		return errors.New("forbidden")
	}
	if doc.LockedByID != nil && *doc.LockedByID != userID {
		return errors.New("document locked by another user")
	}
	return s.repo.SetLock(id, userID)
}

func (s *DocumentService) Unlock(id, userID uint, isAdmin bool) error {
	doc, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if doc.LockedByID == nil {
		return nil
	}
	if !isAdmin && *doc.LockedByID != userID && doc.OwnerID != userID {
		return errors.New("forbidden")
	}
	return s.repo.ClearLock(id)
}

func (s *DocumentService) Delete(id, ownerID uint, isAdmin bool) error {
	doc, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if !isAdmin && doc.OwnerID != ownerID {
		return errors.New("forbidden")
	}
	if s.retention != nil {
		onHold, err := s.retention.IsOnHold(context.Background(), id)
		if err != nil {
			return err
		}
		if onHold {
			return errors.New("document sous conservation légale : suppression interdite")
		}
	}
	if err := s.repo.SoftDelete(id, ownerID, isAdmin); err != nil {
		return err
	}
	jobqueue.EnqueueSearchDelete(context.Background(), id)
	return nil
}

func (s *DocumentService) Purge(id, ownerID uint, isAdmin bool) error {
	if s.retention != nil {
		onHold, err := s.retention.IsOnHold(context.Background(), id)
		if err != nil {
			return err
		}
		if onHold {
			return errors.New("document sous conservation légale : purge interdite")
		}
	}
	if err := s.repo.HardDelete(id, ownerID, isAdmin); err != nil {
		return err
	}
	jobqueue.EnqueueSearchDelete(context.Background(), id)
	return nil
}

func (s *DocumentService) IsOnHold(ctx context.Context, id uint) (bool, error) {
	if s.retention == nil {
		return false, nil
	}
	return s.retention.IsOnHold(ctx, id)
}

// MoveToFolder assigne le document a un dossier (folderID nil = racine).
func (s *DocumentService) MoveToFolder(id, ownerID uint, isAdmin bool, folderID *uint) (*models.Document, error) {
	doc, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if !isAdmin && doc.OwnerID != ownerID {
		return nil, errors.New("forbidden")
	}
	if folderID != nil {
		f, err := s.folderRepo.FindByID(*folderID)
		if err != nil {
			return nil, fmt.Errorf("folder not found")
		}
		if !isAdmin && f.OwnerID != ownerID {
			return nil, errors.New("forbidden folder")
		}
	}
	doc.FolderID = folderID
	doc.ModifiedByID = ownerID
	if err := s.repo.Update(doc); err != nil {
		return nil, err
	}
	return doc, nil
}

// UpdateMACMetadata met a jour classification / departement (archiviste ou proprietaire).
func (s *DocumentService) UpdateMACMetadata(id uint, classification, department *string) (*models.Document, error) {
	doc, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if classification != nil {
		c := strings.TrimSpace(*classification)
		switch c {
		case models.ClassificationPublic, models.ClassificationInternal, models.ClassificationConfidential, "":
			if c == "" {
				c = models.ClassificationInternal
			}
			doc.Classification = c
		default:
			return nil, fmt.Errorf("classification invalide")
		}
	}
	if department != nil {
		doc.Department = strings.TrimSpace(*department)
	}
	if err := s.repo.Update(doc); err != nil {
		return nil, err
	}
	return doc, nil
}

func (s *DocumentService) OpenContent(ctx context.Context, id uint, ownerID uint, isAdmin bool) (io.ReadCloser, string, string, error) {
	doc, err := s.GetByIDWithAuth(id, ownerID, isAdmin)
	if err != nil {
		return nil, "", "", err
	}
	obj, err := config.GetObjectStream(ctx, doc.MinioBucket, doc.MinioObjectName)
	if err != nil {
		return nil, "", "", err
	}
	filename := doc.FileName
	if filename == "" {
		filename = doc.Title
	}
	return obj, doc.MimeType, filename, nil
}

func (s *DocumentService) PresignedPreviewURL(ctx context.Context, id uint, ownerID uint, isAdmin bool) (string, error) {
	doc, err := s.GetByIDWithAuth(id, ownerID, isAdmin)
	if err != nil {
		return "", err
	}
	return config.PresignedGetURL(ctx, doc.MinioBucket, doc.MinioObjectName)
}

func (s *DocumentService) GetByIDWithAuth(id uint, ownerID uint, isAdmin bool) (*models.Document, error) {
	doc, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if !isAdmin && doc.OwnerID != ownerID {
		return nil, errors.New("forbidden")
	}
	return doc, nil
}

type PydioSyncInput struct {
	PydioNodeID string
	Name        string
	Path        string
	MimeType    string
	Size        int64
	Workspace   string
	Metadata    string
	DocumentID  *uint
}

func (s *DocumentService) UpsertPydioSync(in PydioSyncInput) (*models.PydioDocumentSync, error) {
	if in.PydioNodeID == "" {
		return nil, fmt.Errorf("pydio_node_id required")
	}
	row := &models.PydioDocumentSync{
		PydioNodeID:         in.PydioNodeID,
		Name:                in.Name,
		Path:                in.Path,
		MimeType:            in.MimeType,
		Size:                in.Size,
		Workspace:           in.Workspace,
		Metadata:            in.Metadata,
		ArchiflowDocumentID: in.DocumentID,
		SyncStatus:          "synced",
	}
	if row.Workspace == "" {
		row.Workspace = "Common Files"
	}
	if err := s.repo.UpsertPydioSync(row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *DocumentService) DeletePydioSync(nodeID string) error {
	return s.repo.DeletePydioSyncByNodeID(nodeID)
}

func (s *DocumentService) ListPydioSync(limit int) ([]models.PydioDocumentSync, error) {
	return s.repo.ListPydioSync(limit)
}

func FormatFileSize(size int64) string {
	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%d B", size)
	}
	div, exp := int64(unit), 0
	for n := size / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(size)/float64(div), "KMGTPE"[exp])
}

func IsPreviewableMime(mime string) bool {
	m := strings.ToLower(strings.TrimSpace(mime))
	return strings.HasPrefix(m, "image/") ||
		m == "application/pdf" ||
		strings.HasPrefix(m, "text/") ||
		m == "application/json" ||
		m == "application/xml" ||
		strings.HasPrefix(m, "audio/") ||
		strings.HasPrefix(m, "video/")
}

func ExtFromFilename(name string) string {
	return strings.ToLower(filepath.Ext(name))
}
