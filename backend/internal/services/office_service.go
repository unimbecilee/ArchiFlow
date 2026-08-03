package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"strings"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"

	"github.com/golang-jwt/jwt/v5"
)

type OfficeService struct {
	collab   *CollaborationService
	userRepo repository.UserRepository
	policy   *PolicyService
	secret   string
}

func NewOfficeService(collab *CollaborationService, userRepo repository.UserRepository, policy *PolicyService) *OfficeService {
	secret := strings.TrimSpace(os.Getenv("OFFICE_FILE_TOKEN_SECRET"))
	if secret == "" {
		secret = strings.TrimSpace(os.Getenv("ONLYOFFICE_JWT_SECRET"))
	}
	if secret == "" && config.IsDevelopment() {
		secret = os.Getenv("JWT_SECRET")
	}
	if config.IsProduction() && OfficeEnabled() && (secret == "" || secret == os.Getenv("JWT_SECRET")) {
		secret = "" // GetEditorConfig will fail closed via signOfficeToken
	}
	return &OfficeService{collab: collab, userRepo: userRepo, policy: policy, secret: secret}
}

func (s *OfficeService) ParseToken(token, purpose string) (docID, userID uint, err error) {
	return verifyOfficeToken(s.secret, token, purpose)
}

func OfficeEnabled() bool {
	return strings.EqualFold(os.Getenv("ONLYOFFICE_ENABLED"), "true")
}

func officePublicURL() string {
	if v := os.Getenv("ONLYOFFICE_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "http://localhost:9980"
}

// internalAPIBase URL reachable by Document Server container (download + callback).
func internalAPIBase() string {
	if v := os.Getenv("ONLYOFFICE_INTERNAL_API_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	if v := os.Getenv("BACKEND_INTERNAL_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "http://backend:5000"
}

type OfficeEditorConfig struct {
	Enabled        bool           `json:"enabled"`
	DocumentServer string         `json:"document_server,omitempty"`
	Mode           string         `json:"mode,omitempty"`
	Reason         string         `json:"reason,omitempty"`
	Config         map[string]any `json:"config,omitempty"`
}

func (s *OfficeService) GetEditorConfig(
	ctx context.Context,
	docID, userID uint,
	role, userName string,
) (*OfficeEditorConfig, error) {
	if !OfficeEnabled() {
		return &OfficeEditorConfig{Enabled: false, Reason: "OnlyOffice desactive"}, nil
	}
	if s.policy != nil {
		if err := s.policy.EnsureCan(userID, role, docID, ActionRead); err != nil {
			return nil, errors.New("forbidden")
		}
	}
	_, perms, err := s.collab.CanAccess(docID, userID, role)
	if err != nil {
		return nil, err
	}
	if !s.collab.requirePerm(perms, models.PermRead) {
		return nil, errors.New("forbidden")
	}
	doc, err := s.collab.docRepo.FindByID(docID)
	if err != nil {
		return nil, err
	}
	fileType, documentType, okOffice := officeMeta(doc.MimeType, doc.FileName)
	if !okOffice {
		return &OfficeEditorConfig{Enabled: false, Reason: "type non pris en charge par l'editeur bureautique"}, nil
	}
	if doc.MinioObjectName == "" {
		return &OfficeEditorConfig{Enabled: false, Reason: "fichier absent"}, nil
	}
	canWrite := s.collab.requirePerm(perms, models.PermWrite) &&
		models.CapabilitiesForRole(role).WriteDocuments &&
		doc.Status != models.DocumentStatusValidation &&
		(doc.LockedByID == nil || *doc.LockedByID == userID || models.RoleIsAdmin(role))

	mode := "edit"
	if !canWrite {
		mode = "view"
	}
	if doc.Status == models.DocumentStatusValidation {
		mode = "view"
	}

	dlToken, err := signOfficeToken(s.secret, docID, userID, "download", officeTokenTTL())
	if err != nil {
		return &OfficeEditorConfig{Enabled: false, Reason: "configuration office incomplete"}, nil
	}
	cbToken, err := signOfficeToken(s.secret, docID, userID, "callback", officeTokenTTL())
	if err != nil {
		return &OfficeEditorConfig{Enabled: false, Reason: "configuration office incomplete"}, nil
	}

	base := internalAPIBase()
	fileURL := fmt.Sprintf("%s/api/office/files/%d/%s", base, docID, dlToken)
	callbackURL := fmt.Sprintf("%s/api/office/callback/%d/%s", base, docID, cbToken)

	ver := doc.CurrentVersionNumber
	if ver <= 0 {
		ver = 1
	}
	key := documentOfficeKey(docID, ver, doc.UpdatedAt.Unix())

	title := doc.FileName
	if title == "" {
		title = doc.Title
	}
	if path.Ext(title) == "" {
		title += "." + fileType
	}

	cfg := map[string]any{
		"document": map[string]any{
			"fileType": fileType,
			"key":      key,
			"title":    title,
			"url":      fileURL,
		},
		"documentType": documentType,
		"editorConfig": map[string]any{
			"callbackUrl": callbackURL,
			"mode":        mode,
			"lang":        "fr",
			"user": map[string]any{
				"id":   fmt.Sprintf("%d", userID),
				"name": userName,
			},
			"customization": map[string]any{
				"forcesave": true,
			},
		},
	}

	if jwtSecret := os.Getenv("ONLYOFFICE_JWT_SECRET"); jwtSecret != "" {
		signed, err := signOnlyOfficeConfig(cfg, jwtSecret)
		if err != nil {
			return nil, err
		}
		cfg["token"] = signed
	}

	return &OfficeEditorConfig{
		Enabled:        true,
		DocumentServer: officePublicURL(),
		Mode:           mode,
		Config:         cfg,
	}, nil
}

func signOnlyOfficeConfig(cfg map[string]any, secret string) (string, error) {
	b, err := json.Marshal(cfg)
	if err != nil {
		return "", err
	}
	var claims jwt.MapClaims
	if err := json.Unmarshal(b, &claims); err != nil {
		return "", err
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

func (s *OfficeService) StreamDocument(ctx context.Context, docID, userID uint, token string) (io.ReadCloser, string, string, error) {
	tDoc, tUser, err := verifyOfficeToken(s.secret, token, "download")
	if err != nil {
		return nil, "", "", err
	}
	if tDoc != docID || tUser != userID {
		return nil, "", "", errors.New("token mismatch")
	}
	doc, err := s.collab.docRepo.FindByID(docID)
	if err != nil {
		return nil, "", "", err
	}
	if doc.MinioObjectName == "" {
		return nil, "", "", errors.New("file missing")
	}
	rc, err := config.GetObjectStream(ctx, doc.MinioBucket, doc.MinioObjectName)
	if err != nil {
		return nil, "", "", err
	}
	mime := doc.MimeType
	if mime == "" {
		mime = "application/octet-stream"
	}
	name := doc.FileName
	if name == "" {
		name = doc.Title
	}
	return rc, mime, name, nil
}

type onlyOfficeCallback struct {
	Status int    `json:"status"`
	URL    string `json:"url"`
	Key    string `json:"key"`
}

func (s *OfficeService) ProcessCallback(ctx context.Context, docID, userID uint, token string, body []byte) error {
	tDoc, tUser, err := verifyOfficeToken(s.secret, token, "callback")
	if err != nil {
		return err
	}
	if tDoc != docID || tUser != userID {
		return errors.New("token mismatch")
	}

	var cb onlyOfficeCallback
	if err := json.Unmarshal(body, &cb); err != nil {
		return err
	}
	// 2 = must save, 6 = must save while editing
	if cb.Status != 2 && cb.Status != 6 {
		return nil
	}
	if cb.URL == "" {
		return errors.New("missing download url in callback")
	}

	doc, err := s.collab.docRepo.FindByID(docID)
	if err != nil {
		return err
	}
	if doc.Status == models.DocumentStatusValidation {
		return errors.New("document en validation")
	}
	if doc.LockedByID != nil && *doc.LockedByID != userID {
		return errors.New("document verrouille")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cb.URL, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("onlyoffice download failed: %s", resp.Status)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 50*1024*1024))
	if err != nil {
		return err
	}
	u, err := s.userRepo.GetByID(userID)
	if err != nil {
		return errors.New("user not found")
	}
	ok, perms, _ := s.collab.CanAccess(docID, userID, u.Role)
	if !ok || !s.collab.requirePerm(perms, models.PermWrite) || !models.CapabilitiesForRole(u.Role).WriteDocuments {
		return errors.New("forbidden")
	}
	if s.policy != nil {
		if err := s.policy.EnsureCan(userID, u.Role, docID, ActionWrite); err != nil {
			return errors.New("forbidden")
		}
	}

	mime := doc.MimeType
	if ct := resp.Header.Get("Content-Type"); ct != "" && ct != "application/octet-stream" {
		mime = strings.Split(ct, ";")[0]
	}
	_, err = s.collab.publishDocumentBytes(ctx, doc, docID, userID, data, doc.FileName, mime, "Edition OnlyOffice")
	return err
}
