package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"strings"

	"archiflow/backend/internal/authz"
	"archiflow/backend/internal/config"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
)

var (
	ErrShareForbidden    = errors.New("share_forbidden")
	ErrShareUserNotFound = errors.New("share_user_not_found")
	ErrShareSelf         = errors.New("share_self")
	ErrShareNoTarget     = errors.New("share_no_target")
)

type CollaborationService struct {
	collab       *repository.CollaborationRepository
	docRepo      *repository.DocumentRepository
	userRepo     repository.UserRepository
	workflowRepo *repository.WorkflowRepository
	bucket       string
	realtime     *NotificationRealtime
}

func NewCollaborationService(
	collab *repository.CollaborationRepository,
	docRepo *repository.DocumentRepository,
	userRepo repository.UserRepository,
	workflowRepo *repository.WorkflowRepository,
	bucket string,
	rt *NotificationRealtime,
) *CollaborationService {
	return &CollaborationService{
		collab:       collab,
		docRepo:      docRepo,
		userRepo:     userRepo,
		workflowRepo: workflowRepo,
		bucket:       bucket,
		realtime:     rt,
	}
}

func encodePerms(perms []string) string {
	b, _ := json.Marshal(perms)
	return string(b)
}

func decodePerms(raw string) []string {
	var perms []string
	_ = json.Unmarshal([]byte(raw), &perms)
	return perms
}

func (s *CollaborationService) CanAccess(docID, userID uint, role string) (bool, []string, error) {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return false, nil, err
	}

	// MAC / ABAC département (avant RBAC classique)
	if authz.MACDeny(doc, userID, role, s.userRepo) {
		return false, nil, nil
	}

	if doc.OwnerID == userID {
		return true, []string{models.PermRead, models.PermDownload, models.PermWrite, models.PermComment, models.PermShare}, nil
	}
	if models.RoleIsAdmin(role) {
		return true, []string{models.PermRead, models.PermDownload, models.PermWrite, models.PermComment, models.PermShare}, nil
	}
	// Archiviste : lecture org + peut classer (metadonnees) sans editer le contenu binaire.
	if role == models.RoleArchivist {
		return true, []string{models.PermRead, models.PermDownload, models.PermComment}, nil
	}
	if doc.Status == models.DocumentStatusValidation {
		if role == models.RoleValidator || role == models.RoleManager {
			return true, []string{models.PermRead, models.PermDownload}, nil
		}
		if s.workflowRepo != nil {
			ok, err := s.workflowRepo.UserMayAccessDocumentForWorkflow(docID, userID, role)
			if err != nil {
				return false, nil, err
			}
			if ok {
				return true, []string{models.PermRead, models.PermDownload}, nil
			}
		}
	}
	share, err := s.collab.FindShare(docID, userID)
	if err != nil {
		return false, nil, nil
	}
	return true, decodePerms(share.Permissions), nil
}

func (s *CollaborationService) requirePerm(perms []string, need string) bool {
	for _, p := range perms {
		if p == need {
			return true
		}
	}
	return false
}

func (s *CollaborationService) ShareDocument(docID, sharedByID uint, sharerRole string, targetEmail string, targetUserID uint, perms []string, message string) error {
	targetEmail = strings.TrimSpace(targetEmail)
	if targetUserID == 0 && targetEmail == "" {
		return ErrShareNoTarget
	}

	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return err
	}
	if doc.OwnerID != sharedByID {
		share, shareErr := s.collab.FindShare(docID, sharedByID)
		if shareErr != nil {
			return ErrShareForbidden
		}
		if !s.requirePerm(decodePerms(share.Permissions), models.PermShare) {
			return ErrShareForbidden
		}
	}
	var target *models.User
	if targetUserID > 0 {
		target, err = s.userRepo.GetByID(targetUserID)
	} else {
		target, err = s.userRepo.GetByEmail(targetEmail)
	}
	if err != nil {
		return ErrShareUserNotFound
	}
	if target.ID == sharedByID {
		return ErrShareSelf
	}
	if len(perms) == 0 {
		perms = []string{models.PermRead, models.PermDownload}
	}
	share := &models.DocumentShare{
		DocumentID:   docID,
		SharedWithID: target.ID,
		SharedByID:   sharedByID,
		Permissions:  encodePerms(perms),
		Active:       true,
		Message:      message,
	}
	if err := s.collab.UpsertShare(share); err != nil {
		return err
	}
	_ = s.notifyUser(target.ID, "SHARE", "Document partagé", fmt.Sprintf("« %s » partagé avec vous", doc.Title), fmt.Sprintf("/documents/%d", docID))
	return nil
}

func (s *CollaborationService) ListSharedWithMe(userID uint) ([]map[string]any, error) {
	shares, err := s.collab.ListSharesForUser(userID)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(shares))
	for _, sh := range shares {
		doc := sh.Document
		if doc == nil {
			continue
		}
		perms := decodePerms(sh.Permissions)
		canWrite := s.requirePerm(perms, models.PermWrite)
		out = append(out, map[string]any{
			"id":                 doc.ID,
			"titre":              doc.Title,
			"description":        doc.Description,
			"taille":             doc.Size,
			"taille_formatee":    FormatFileSize(doc.Size),
			"mime_type":          doc.MimeType,
			"file_name":          doc.FileName,
			"previewable":        IsPreviewable(doc.MimeType, doc.FileName),
			"editable":           IsEditableDocument(doc.MimeType, doc.FileName),
			"office_editable":    IsOfficeDocument(doc.MimeType, doc.FileName),
			"status":             doc.Status,
			"is_locked":          doc.LockedByID != nil,
			"can_write":          canWrite,
			"date_creation":      doc.CreatedAt,
			"permissions":        perms,
			"date_partage":       sh.CreatedAt,
			"proprietaire_id":    doc.OwnerID,
		})
	}
	return out, nil
}

func (s *CollaborationService) ListComments(docID, userID uint, role string) ([]models.DocumentComment, error) {
	ok, perms, _ := s.CanAccess(docID, userID, role)
	if !ok || !s.requirePerm(perms, models.PermRead) {
		return nil, errors.New("forbidden")
	}
	return s.collab.ListComments(docID)
}

func (s *CollaborationService) AddComment(docID, userID uint, role string, content string, parentID *uint) (*models.DocumentComment, error) {
	ok, perms, _ := s.CanAccess(docID, userID, role)
	if !ok || !s.requirePerm(perms, models.PermComment) {
		return nil, errors.New("forbidden")
	}
	c := &models.DocumentComment{
		DocumentID: docID,
		Content:    content,
		AuthorID:   userID,
		ParentID:   parentID,
	}
	if err := s.collab.CreateComment(c); err != nil {
		return nil, err
	}
	doc, _ := s.docRepo.FindByID(docID)
	if doc != nil && doc.OwnerID != userID {
		_ = s.notifyUser(doc.OwnerID, "COMMENT", "Nouveau commentaire", content, fmt.Sprintf("/documents/%d", docID))
	}
	return s.collab.GetComment(c.ID)
}

func (s *CollaborationService) DeleteComment(commentID, userID uint, role string) error {
	c, err := s.collab.GetComment(commentID)
	if err != nil {
		return err
	}
	if !models.RoleIsAdmin(role) && c.AuthorID != userID {
		return errors.New("forbidden")
	}
	return s.collab.DeleteComment(commentID)
}

func (s *CollaborationService) ListVersions(docID, userID uint, role string) ([]models.DocumentVersion, error) {
	ok, perms, _ := s.CanAccess(docID, userID, role)
	if !ok || !s.requirePerm(perms, models.PermRead) {
		return nil, errors.New("forbidden")
	}
	return s.collab.ListVersions(docID)
}

func (s *CollaborationService) UploadVersion(ctx context.Context, docID, userID uint, role string, file *multipart.FileHeader, comment string) (*models.DocumentVersion, error) {
	ok, perms, err := s.CanAccess(docID, userID, role)
	if !ok || !s.requirePerm(perms, models.PermWrite) {
		return nil, errors.New("forbidden")
	}
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, err
	}
	if doc.Status == models.DocumentStatusValidation {
		return nil, errors.New("document en validation : annulez le workflow avant une nouvelle version")
	}

	f, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()
	data, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}
	ct := file.Header.Get("Content-Type")
	if ct == "" {
		ct = "application/octet-stream"
	}
	if comment == "" {
		comment = "Nouvelle version (upload)"
	}
	return s.publishDocumentBytes(ctx, doc, docID, userID, data, file.Filename, ct, comment)
}

func (s *CollaborationService) OpenVersionContent(
	ctx context.Context,
	docID, versionID, userID uint,
	role string,
) (io.ReadCloser, string, string, error) {
	ok, perms, err := s.CanAccess(docID, userID, role)
	if !ok || !s.requirePerm(perms, models.PermRead) {
		return nil, "", "", errors.New("forbidden")
	}
	ver, err := s.collab.GetVersion(versionID)
	if err != nil || ver.DocumentID != docID {
		return nil, "", "", errors.New("version not found")
	}
	bucket := strings.TrimSpace(ver.MinioBucket)
	key := strings.TrimSpace(ver.MinioObjectName)
	if bucket == "" || key == "" {
		return nil, "", "", ErrStorageMissing
	}
	if _, _, err := config.StatObject(ctx, bucket, key); err != nil {
		if isMinioNotFound(err) {
			return nil, "", "", ErrStorageMissing
		}
		return nil, "", "", fmt.Errorf("stockage: %w", err)
	}
	reader, err := config.GetObjectStream(ctx, bucket, key)
	if err != nil {
		if isMinioNotFound(err) {
			return nil, "", "", ErrStorageMissing
		}
		return nil, "", "", err
	}
	mime := ver.MimeType
	if mime == "" {
		mime = "application/octet-stream"
	}
	return reader, mime, ver.FileName, nil
}

func (s *CollaborationService) ListTags() ([]models.Tag, error) {
	return s.collab.ListTags()
}

func (s *CollaborationService) AddTagToDocument(docID, userID uint, role string, tagName, color string) ([]models.Tag, error) {
	ok, perms, err := s.CanAccess(docID, userID, role)
	if !ok || !s.requirePerm(perms, models.PermWrite) {
		return nil, errors.New("forbidden")
	}
	tag, err := s.collab.FindOrCreateTag(tagName, color)
	if err != nil {
		return nil, err
	}
	if err := s.collab.LinkTag(docID, tag.ID); err != nil {
		return nil, err
	}
	return s.collab.ListDocumentTags(docID)
}

func (s *CollaborationService) RemoveTag(docID, tagID, userID uint, role string) error {
	ok, perms, _ := s.CanAccess(docID, userID, role)
	if !ok || !s.requirePerm(perms, models.PermWrite) {
		return errors.New("forbidden")
	}
	return s.collab.UnlinkTag(docID, tagID)
}

func (s *CollaborationService) GetDocumentTags(docID, userID uint, role string) ([]models.Tag, error) {
	ok, perms, _ := s.CanAccess(docID, userID, role)
	if !ok || !s.requirePerm(perms, models.PermRead) {
		return nil, errors.New("forbidden")
	}
	return s.collab.ListDocumentTags(docID)
}

func (s *CollaborationService) ListNotifications(userID uint) ([]models.Notification, error) {
	return s.collab.ListNotifications(userID, 50)
}

func (s *CollaborationService) MarkRead(id, userID uint) error {
	if err := s.collab.MarkNotificationRead(id, userID); err != nil {
		return err
	}
	if s.realtime != nil {
		s.realtime.Publish(userID)
	}
	return nil
}

func (s *CollaborationService) MarkAllRead(userID uint) error {
	if err := s.collab.MarkAllNotificationsRead(userID); err != nil {
		return err
	}
	if s.realtime != nil {
		s.realtime.Publish(userID)
	}
	return nil
}

func (s *CollaborationService) UnreadCount(userID uint) (int64, error) {
	return s.collab.CountUnread(userID)
}

func (s *CollaborationService) UnreadShareCount(userID uint) (int64, error) {
	return s.collab.CountUnreadByType(userID, "SHARE")
}

func (s *CollaborationService) PollNotificationsSince(userID, sinceID uint) ([]models.Notification, int64, error) {
	rows, err := s.collab.ListNotificationsSince(userID, sinceID, 30)
	if err != nil {
		return nil, 0, err
	}
	unread, err := s.collab.CountUnread(userID)
	return rows, unread, err
}

func (s *CollaborationService) notifyUser(userID uint, typ, title, message, link string) error {
	n := &models.Notification{
		UserID:  userID,
		Type:    typ,
		Title:   title,
		Message: message,
		Link:    link,
	}
	if err := s.collab.CreateNotification(n); err != nil {
		return err
	}
	if s.realtime != nil {
		s.realtime.Publish(userID, *n)
	}
	return nil
}
