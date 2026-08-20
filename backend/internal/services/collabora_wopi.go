package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/models"
)

func CollaboraEnabled() bool {
	return strings.EqualFold(os.Getenv("COLLABORA_ENABLED"), "true")
}

func collaboraPublicURL() string {
	if v := os.Getenv("COLLABORA_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	if v := os.Getenv("NEXT_PUBLIC_COLLABORA_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "http://localhost:9981"
}

// publicAPIBase URL atteignable par Collabora pour WOPISrc (host navigateur ou tunnel).
func publicAPIBase() string {
	if v := os.Getenv("WOPI_PUBLIC_API_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	if v := os.Getenv("FRONTEND_URL"); v != "" {
		// Via rewrite Next /api → backend
		return strings.TrimRight(v, "/")
	}
	return "http://localhost:3000"
}

type CollaboraEditorConfig struct {
	Enabled     bool   `json:"enabled"`
	Provider    string `json:"provider"`
	EditorURL   string `json:"editor_url,omitempty"`
	Mode        string `json:"mode,omitempty"`
	Reason      string `json:"reason,omitempty"`
	CollaboraURL string `json:"collabora_url,omitempty"`
}

func (s *OfficeService) GetCollaboraEditorConfig(
	ctx context.Context,
	docID, userID uint,
	role, userName string,
) (*OfficeEditorConfig, error) {
	if !CollaboraEnabled() {
		return &OfficeEditorConfig{Enabled: false, Reason: "Collabora desactive"}, nil
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
	if _, _, ok := officeMeta(doc.MimeType, doc.FileName); !ok {
		return &OfficeEditorConfig{Enabled: false, Reason: "type non pris en charge par Collabora"}, nil
	}
	if doc.MinioObjectName == "" {
		return &OfficeEditorConfig{Enabled: false, Reason: "fichier absent"}, nil
	}

	canWrite := s.collab.requirePerm(perms, models.PermWrite) &&
		models.CapabilitiesForRole(role).WriteDocuments &&
		doc.Status != models.DocumentStatusValidation &&
		(doc.LockedByID == nil || *doc.LockedByID == userID || models.RoleIsAdmin(role))

	mode := "edit"
	if !canWrite || doc.Status == models.DocumentStatusValidation {
		mode = "view"
	}

	purpose := "wopi"
	token, err := signOfficeToken(s.secret, docID, userID, purpose, officeTokenTTL())
	if err != nil {
		return &OfficeEditorConfig{Enabled: false, Reason: "configuration Collabora incomplete"}, nil
	}

	wopiSrc := fmt.Sprintf("%s/api/wopi/files/%d", publicAPIBase(), docID)
	editorURL := fmt.Sprintf(
		"%s/browser/dist/cool.html?WOPISrc=%s&access_token=%s&lang=fr",
		collaboraPublicURL(),
		urlQueryEscape(wopiSrc),
		urlQueryEscape(token),
	)

	return &OfficeEditorConfig{
		Enabled:        true,
		DocumentServer: collaboraPublicURL(),
		Mode:           mode,
		Config: map[string]any{
			"provider":     "collabora",
			"editor_url":   editorURL,
			"wopi_src":     wopiSrc,
			"access_token": token,
			"user":         userName,
		},
	}, nil
}

func urlQueryEscape(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, ":", "%3A"), "/", "%2F")
	// use net/url properly below — this helper is replaced
}

// CheckFileInfo WOPI.
func (s *OfficeService) WopiCheckFileInfo(ctx context.Context, docID uint, accessToken string) (map[string]any, error) {
	docIDTok, userID, err := verifyOfficeToken(s.secret, accessToken, "wopi")
	if err != nil || docIDTok != docID {
		return nil, errors.New("unauthorized")
	}
	u, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("unauthorized")
	}
	ok, perms, _ := s.collab.CanAccess(docID, userID, u.Role)
	if !ok || !s.collab.requirePerm(perms, models.PermRead) {
		return nil, errors.New("forbidden")
	}
	doc, err := s.collab.docRepo.FindByID(docID)
	if err != nil {
		return nil, err
	}
	canWrite := s.collab.requirePerm(perms, models.PermWrite) &&
		models.CapabilitiesForRole(u.Role).WriteDocuments &&
		doc.Status != models.DocumentStatusValidation &&
		(doc.LockedByID == nil || *doc.LockedByID == userID || models.RoleIsAdmin(u.Role))

	name := doc.FileName
	if name == "" {
		name = doc.Title
	}
	ver := doc.CurrentVersionNumber
	if ver <= 0 {
		ver = 1
	}
	return map[string]any{
		"BaseFileName":                name,
		"Size":                        doc.Size,
		"OwnerId":                     fmt.Sprintf("%d", doc.OwnerID),
		"UserId":                      fmt.Sprintf("%d", userID),
		"UserFriendlyName":            u.Email,
		"UserCanWrite":                canWrite,
		"UserCanNotWriteRelative":     true,
		"SupportsUpdate":              canWrite,
		"SupportsLocks":               false,
		"Version":                     fmt.Sprintf("%d-%d", ver, doc.UpdatedAt.Unix()),
		"LastModifiedTime":            doc.UpdatedAt.UTC().Format(time.RFC3339),
		"EnableOwnerTermination":      false,
		"DisablePrint":                false,
		"DisableExport":               false,
		"DisableCopy":                 false,
	}, nil
}

func (s *OfficeService) WopiGetFile(ctx context.Context, docID uint, accessToken string) (io.ReadCloser, string, int64, error) {
	docIDTok, userID, err := verifyOfficeToken(s.secret, accessToken, "wopi")
	if err != nil || docIDTok != docID {
		return nil, "", 0, errors.New("unauthorized")
	}
	u, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, "", 0, errors.New("unauthorized")
	}
	ok, perms, _ := s.collab.CanAccess(docID, userID, u.Role)
	if !ok || !s.collab.requirePerm(perms, models.PermRead) {
		return nil, "", 0, errors.New("forbidden")
	}
	doc, err := s.collab.docRepo.FindByID(docID)
	if err != nil {
		return nil, "", 0, err
	}
	if doc.MinioObjectName == "" {
		return nil, "", 0, errors.New("file missing")
	}
	rc, err := config.GetObjectStream(ctx, doc.MinioBucket, doc.MinioObjectName)
	if err != nil {
		return nil, "", 0, err
	}
	mime := doc.MimeType
	if mime == "" {
		mime = "application/octet-stream"
	}
	return rc, mime, doc.Size, nil
}

func (s *OfficeService) WopiPutFile(ctx context.Context, docID uint, accessToken string, body io.Reader) error {
	docIDTok, userID, err := verifyOfficeToken(s.secret, accessToken, "wopi")
	if err != nil || docIDTok != docID {
		return errors.New("unauthorized")
	}
	u, err := s.userRepo.GetByID(userID)
	if err != nil {
		return errors.New("unauthorized")
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
	data, err := io.ReadAll(io.LimitReader(body, 50*1024*1024))
	if err != nil {
		return err
	}
	mime := doc.MimeType
	if mime == "" {
		mime = "application/octet-stream"
	}
	_, err = s.collab.publishDocumentBytes(ctx, doc, docID, userID, data, doc.FileName, mime, "Edition Collabora")
	return err
}
