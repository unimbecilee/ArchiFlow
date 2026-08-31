package services

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/draw"
	"image/jpeg"
	"image/png"
	"io"
	"strings"
	"time"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"

	"github.com/minio/minio-go/v7"
	"golang.org/x/crypto/bcrypt"
)

type ShareService struct {
	repo        *repository.ShareRepository
	minioClient *minio.Client
	bucket      string
}

func NewShareService(repo *repository.ShareRepository, minioClient *minio.Client, bucket string) *ShareService {
	return &ShareService{repo: repo, minioClient: minioClient, bucket: bucket}
}

func (s *ShareService) CreateShare(ctx context.Context, ownerID, documentID uint, req CreateShareRequest) (*models.ExternalShare, error) {
	doc, err := s.repo.GetDocumentByID(ctx, documentID)
	if err != nil {
		return nil, errors.New("document not found")
	}
	if doc.OwnerID != ownerID {
		return nil, errors.New("forbidden")
	}
	token, err := generateToken(32)
	if err != nil {
		return nil, err
	}
	var passwordHash string
	if req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		passwordHash = string(hash)
	}
	perms := req.Permissions
	if len(perms) == 0 {
		perms = []string{"download", "preview"}
	}
	permsJSON, _ := json.Marshal(perms)
	watermarkText := req.WatermarkText
	if watermarkText == "" {
		watermarkText = "{{email}} - {{timestamp}}"
	}
	share := &models.ExternalShare{
		DocumentID:       documentID,
		OwnerID:          ownerID,
		Token:            token,
		PasswordHash:     passwordHash,
		ExpiresAt:        req.ExpiresAt,
		MaxDownloads:     req.MaxDownloads,
		Permissions:      string(permsJSON),
		WatermarkEnabled: req.WatermarkEnabled,
		WatermarkText:    watermarkText,
		IsActive:         true,
	}
	if err := s.repo.CreateExternalShare(ctx, share); err != nil {
		return nil, err
	}
	return share, nil
}

func (s *ShareService) GetShareByToken(ctx context.Context, token string) (*models.ExternalShare, error) {
	share, err := s.repo.GetExternalShareByToken(ctx, token)
	if err != nil {
		return nil, err
	}
	if !share.IsActive {
		return nil, errors.New("share inactive")
	}
	if share.ExpiresAt != nil && share.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("share expired")
	}
	return share, nil
}

func (s *ShareService) ValidatePassword(share *models.ExternalShare, password string) bool {
	if share.PasswordHash == "" {
		return true
	}
	return bcrypt.CompareHashAndPassword([]byte(share.PasswordHash), []byte(password)) == nil
}

func (s *ShareService) AccessShare(ctx context.Context, token, password, ip, userAgent string) (*models.ExternalShare, error) {
	share, err := s.GetShareByToken(ctx, token)
	if err != nil {
		s.logAccess(ctx, 0, ip, userAgent, "access", false, err.Error())
		return nil, err
	}
	if !s.ValidatePassword(share, password) {
		s.logAccess(ctx, share.ID, ip, userAgent, "access", false, "invalid password")
		return nil, errors.New("invalid password")
	}
	if share.MaxDownloads > 0 && share.DownloadCount >= share.MaxDownloads {
		s.logAccess(ctx, share.ID, ip, userAgent, "access", false, "max downloads reached")
		return nil, errors.New("max downloads reached")
	}
	s.logAccess(ctx, share.ID, ip, userAgent, "access", true, "")
	return share, nil
}

func (s *ShareService) DownloadFile(ctx context.Context, share *models.ExternalShare) (io.ReadCloser, string, string, error) {
	doc, err := s.repo.GetDocumentByID(ctx, share.DocumentID)
	if err != nil {
		return nil, "", "", err
	}
	if s.minioClient == nil {
		return nil, "", "", errors.New("storage unavailable")
	}
	obj, err := s.minioClient.GetObject(ctx, s.bucket, doc.MinioObjectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, "", "", err
	}
	share.DownloadCount++
	_ = s.repo.UpdateExternalShare(ctx, share)
	s.logAccess(ctx, share.ID, "", "", "download", true, "")
	perms := []string{}
	_ = json.Unmarshal([]byte(share.Permissions), &perms)
	if share.WatermarkEnabled && contains(perms, "watermark") {
		wm, err := s.applyWatermarkStream(obj, doc.MimeType)
		if err == nil {
			return wm, doc.MimeType, doc.FileName, nil
		}
	}
	return obj, doc.MimeType, doc.FileName, nil
}

func (s *ShareService) PreviewFile(ctx context.Context, share *models.ExternalShare) (io.ReadCloser, string, error) {
	doc, err := s.repo.GetDocumentByID(ctx, share.DocumentID)
	if err != nil {
		return nil, "", err
	}
	if s.minioClient == nil {
		return nil, "", errors.New("storage unavailable")
	}
	obj, err := s.minioClient.GetObject(ctx, s.bucket, doc.MinioObjectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, "", err
	}
	perms := []string{}
	_ = json.Unmarshal([]byte(share.Permissions), &perms)
	if share.WatermarkEnabled && contains(perms, "watermark") {
		wm, err := s.applyWatermarkStream(obj, doc.MimeType)
		if err == nil {
			return wm, doc.MimeType, nil
		}
	}
	return obj, doc.MimeType, nil
}

func (s *ShareService) applyWatermarkStream(reader io.Reader, mime string) (io.ReadCloser, error) {
	if strings.HasPrefix(mime, "image/") {
		return s.watermarkImage(reader)
	}
	return io.NopCloser(reader), nil
}

func (s *ShareService) watermarkImage(reader io.Reader) (io.ReadCloser, error) {
	img, format, err := image.Decode(reader)
	if err != nil {
		return nil, err
	}
	bounds := img.Bounds()
	watermark := image.NewRGBA(bounds)
	draw.Draw(watermark, bounds, img, image.Point{}, draw.Src)
	buf := new(bytes.Buffer)
	switch format {
	case "jpeg", "jpg":
		_ = jpeg.Encode(buf, watermark, &jpeg.Options{Quality: 90})
	case "png":
		_ = png.Encode(buf, watermark)
	default:
		_ = jpeg.Encode(buf, watermark, &jpeg.Options{Quality: 90})
	}
	return io.NopCloser(buf), nil
}

func (s *ShareService) ListShares(ctx context.Context, ownerID uint, admin bool) ([]models.ExternalShare, error) {
	return s.repo.ListExternalShares(ctx, ownerID, admin)
}

func (s *ShareService) RevokeShare(ctx context.Context, shareID, ownerID uint, admin bool) error {
	share, err := s.repo.GetExternalShareByID(ctx, shareID)
	if err != nil {
		return err
	}
	if !admin && share.OwnerID != ownerID {
		return errors.New("forbidden")
	}
	share.IsActive = false
	return s.repo.UpdateExternalShare(ctx, share)
}

func (s *ShareService) CreateFileRequest(ctx context.Context, ownerID uint, req CreateFileRequestRequest) (*models.FileRequest, error) {
	token, err := generateToken(32)
	if err != nil {
		return nil, err
	}
	var passwordHash string
	if req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		passwordHash = string(hash)
	}
	allowedTypes := req.AllowedTypes
	if allowedTypes == "" {
		allowedTypes = "[]"
	}
	fr := &models.FileRequest{
		OwnerID:        ownerID,
		FolderID:       req.FolderID,
		Token:          token,
		Title:          req.Title,
		Description:    req.Description,
		ExpiresAt:      req.ExpiresAt,
		MaxFiles:       req.MaxFiles,
		MaxFileSizeMB:  req.MaxFileSizeMB,
		AllowedTypes:   allowedTypes,
		PasswordHash:   passwordHash,
		NotifyOnUpload: req.NotifyOnUpload,
		IsActive:       true,
	}
	if fr.MaxFiles == 0 {
		fr.MaxFiles = 10
	}
	if fr.MaxFileSizeMB == 0 {
		fr.MaxFileSizeMB = 100
	}
	if err := s.repo.CreateFileRequest(ctx, fr); err != nil {
		return nil, err
	}
	return fr, nil
}

func (s *ShareService) UploadToFileRequest(ctx context.Context, token string, file FileUpload) (*models.FileRequestUpload, error) {
	fr, err := s.repo.GetFileRequestByToken(ctx, token)
	if err != nil {
		return nil, errors.New("invalid or expired request")
	}
	if !fr.IsActive {
		return nil, errors.New("request inactive")
	}
	if fr.ExpiresAt != nil && fr.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("request expired")
	}
	count, _ := s.repo.CountUploadsForRequest(ctx, fr.ID)
	if int(count) >= fr.MaxFiles {
		return nil, errors.New("max files reached")
	}
	if file.Size > int64(fr.MaxFileSizeMB)*1024*1024 {
		return nil, errors.New("file too large")
	}
	allowed := []string{}
	_ = json.Unmarshal([]byte(fr.AllowedTypes), &allowed)
	if len(allowed) > 0 && !contains(allowed, file.MimeType) {
		return nil, errors.New("file type not allowed")
	}
	if s.minioClient == nil {
		return nil, errors.New("storage unavailable")
	}
	objectName := fmt.Sprintf("file-requests/%d/%s", fr.ID, file.FileName)
	_, err = s.minioClient.PutObject(ctx, s.bucket, objectName, file.Reader, file.Size, minio.PutObjectOptions{ContentType: file.MimeType})
	if err != nil {
		return nil, err
	}
	doc := &models.Document{
		OwnerID:         fr.OwnerID,
		FolderID:        fr.FolderID,
		Title:           file.FileName,
		FileName:        file.FileName,
		MimeType:        file.MimeType,
		Size:            file.Size,
		MinioBucket:     s.bucket,
		MinioObjectName: objectName,
		Status:          models.DocumentStatusApproved,
		Classification:  models.ClassificationInternal,
	}
	if err := s.repo.CreateDocumentRecord(ctx, doc); err != nil {
		return nil, err
	}
	upload := &models.FileRequestUpload{
		FileRequestID: fr.ID,
		DocumentID:    &doc.ID,
		FileName:      file.FileName,
		Size:          file.Size,
		MimeType:      file.MimeType,
		UploadedBy:    file.UploadedBy,
		UploadedAt:    time.Now(),
	}
	if err := s.repo.CreateFileRequestUpload(ctx, upload); err != nil {
		return nil, err
	}
	return upload, nil
}

func (s *ShareService) logAccess(ctx context.Context, shareID uint, ip, ua, action string, success bool, errMsg string) {
	l := &models.ShareAccessLog{ShareID: shareID, IP: ip, UserAgent: ua, Action: action, Success: success, ErrorMsg: errMsg}
	_ = s.repo.CreateShareAccessLog(ctx, l)
}

func generateToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

type CreateShareRequest struct {
	ExpiresAt        *time.Time `json:"expires_at"`
	MaxDownloads     int        `json:"max_downloads"`
	Password         string     `json:"password,omitempty"`
	Permissions      []string   `json:"permissions"`
	WatermarkEnabled bool       `json:"watermark_enabled"`
	WatermarkText    string     `json:"watermark_text,omitempty"`
}

type CreateFileRequestRequest struct {
	FolderID       *uint      `json:"folder_id,omitempty"`
	Title          string     `json:"title" validate:"required,max=255"`
	Description    string     `json:"description,omitempty"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	MaxFiles       int        `json:"max_files" validate:"gte=1"`
	MaxFileSizeMB  int        `json:"max_file_size_mb" validate:"gte=1"`
	AllowedTypes   string     `json:"allowed_types,omitempty"`
	Password       string     `json:"password,omitempty"`
	NotifyOnUpload bool       `json:"notify_on_upload"`
}

type FileUpload struct {
	FileName   string
	Size       int64
	MimeType   string
	Reader     io.Reader
	UploadedBy string
}
