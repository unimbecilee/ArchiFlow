package services

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"path"
	"strings"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/models"
)

const maxEditableBytes = 2 * 1024 * 1024

// IsEditableDocument indique si le fichier peut etre edite en ligne (texte / markdown / json).
func IsEditableDocument(mimeType, fileName string) bool {
	m := strings.ToLower(strings.TrimSpace(mimeType))
	if strings.HasPrefix(m, "text/") {
		return true
	}
	switch m {
	case "application/json", "application/xml", "application/javascript":
		return true
	}
	ext := strings.ToLower(path.Ext(fileName))
	switch ext {
	case ".txt", ".md", ".markdown", ".json", ".csv", ".xml", ".yml", ".yaml", ".log":
		return true
	}
	return false
}

type DocumentEditableContent struct {
	Editable bool   `json:"editable"`
	Content  string `json:"content,omitempty"`
	MimeType string `json:"mime_type,omitempty"`
	FileName string `json:"file_name,omitempty"`
	Reason   string `json:"reason,omitempty"`
}

func (s *CollaborationService) GetEditableContent(
	ctx context.Context,
	docID, userID uint,
	role string,
) (*DocumentEditableContent, error) {
	ok, perms, err := s.CanAccess(docID, userID, role)
	if !ok || !s.requirePerm(perms, models.PermRead) {
		return nil, errors.New("forbidden")
	}
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, err
	}
	if !IsEditableDocument(doc.MimeType, doc.FileName) {
		return &DocumentEditableContent{
			Editable: false,
			Reason:   "type de fichier non editable en ligne",
		}, nil
	}
	if doc.MinioObjectName == "" {
		return &DocumentEditableContent{Editable: false, Reason: "fichier absent"}, nil
	}
	if _, _, err := config.StatObject(ctx, doc.MinioBucket, doc.MinioObjectName); err != nil {
		if isMinioNotFound(err) {
			return &DocumentEditableContent{Editable: false, Reason: ErrStorageMissing.Error()}, nil
		}
		return nil, err
	}
	reader, err := config.GetObjectStream(ctx, doc.MinioBucket, doc.MinioObjectName)
	if err != nil {
		return nil, err
	}
	defer reader.Close()
	data, err := io.ReadAll(io.LimitReader(reader, maxEditableBytes+1))
	if err != nil {
		return nil, err
	}
	if len(data) > maxEditableBytes {
		return &DocumentEditableContent{
			Editable: false,
			Reason:   fmt.Sprintf("fichier trop volumineux pour edition en ligne (max %d Mo)", maxEditableBytes/(1024*1024)),
		}, nil
	}
	return &DocumentEditableContent{
		Editable: true,
		Content:  string(data),
		MimeType: doc.MimeType,
		FileName: doc.FileName,
	}, nil
}

func (s *CollaborationService) SaveTextEdit(
	ctx context.Context,
	docID, userID uint,
	role string,
	content, comment string,
) (*models.DocumentVersion, error) {
	ok, perms, err := s.CanAccess(docID, userID, role)
	if !ok || !s.requirePerm(perms, models.PermWrite) {
		return nil, errors.New("forbidden")
	}
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, err
	}
	if doc.Status == models.DocumentStatusValidation {
		return nil, errors.New("document en validation : annulez le workflow avant modification")
	}
	if doc.LockedByID != nil && *doc.LockedByID != userID && !models.RoleIsAdmin(role) {
		return nil, errors.New("document verrouille par un autre utilisateur")
	}
	if !IsEditableDocument(doc.MimeType, doc.FileName) {
		return nil, errors.New("type de fichier non editable")
	}
	data := []byte(content)
	if len(data) > maxEditableBytes {
		return nil, fmt.Errorf("contenu trop volumineux (max %d Mo)", maxEditableBytes/(1024*1024))
	}
	if comment == "" {
		comment = "Edition en ligne"
	} else {
		comment = "Edition en ligne : " + comment
	}
	return s.publishDocumentBytes(ctx, doc, docID, userID, data, doc.FileName, doc.MimeType, comment)
}

func (s *CollaborationService) publishDocumentBytes(
	ctx context.Context,
	doc *models.Document,
	docID, userID uint,
	data []byte,
	fileName, mimeType, comment string,
) (*models.DocumentVersion, error) {
	max, _ := s.collab.MaxVersionNumber(docID)
	snapNum := max
	if snapNum == 0 {
		snapNum = 1
	}
	if doc.MinioObjectName != "" {
		_ = s.collab.CreateVersion(&models.DocumentVersion{
			DocumentID:      docID,
			VersionNumber:   snapNum,
			FileName:        doc.FileName,
			MinioBucket:     doc.MinioBucket,
			MinioObjectName: doc.MinioObjectName,
			Size:            doc.Size,
			MimeType:        doc.MimeType,
			CreatedByID:     doc.ModifiedByID,
			Comment:         "Snapshot avant nouvelle version",
		})
	}
	newNum := snapNum + 1

	obj := config.NewArchiveObjectName(fileName)
	size := int64(len(data))
	_, err := config.UploadObject(ctx, s.bucket, obj, bytes.NewReader(data), size, mimeType)
	if err != nil {
		return nil, err
	}

	doc.FileName = fileName
	doc.MinioObjectName = obj
	doc.Size = size
	doc.MimeType = mimeType
	doc.ModifiedByID = userID
	doc.CurrentVersionNumber = newNum
	if doc.Status == models.DocumentStatusRejected {
		doc.Status = models.DocumentStatusDraft
	}
	_ = s.docRepo.Update(doc)

	ver := &models.DocumentVersion{
		DocumentID:      docID,
		VersionNumber:   newNum,
		FileName:        fileName,
		MinioBucket:     s.bucket,
		MinioObjectName: obj,
		Size:            size,
		MimeType:        mimeType,
		CreatedByID:     userID,
		Comment:         comment,
	}
	if err := s.collab.CreateVersion(ver); err != nil {
		return nil, err
	}
	return ver, nil
}
