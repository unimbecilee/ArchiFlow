package services

import (
	"context"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"

	"archiflow/backend/internal/repository"
)

// UploadTokenService mints SFTPGo JWTs and virtual paths for browser hot-path uploads.
type UploadTokenService struct {
	sftpgo     *SFTPGoUploadClient
	folders    *FolderService
	users      repository.UserRepository
	quota      *UploadQuotaService
}

func NewUploadTokenService(
	sftpgo *SFTPGoUploadClient,
	folders *FolderService,
	users repository.UserRepository,
	quota *UploadQuotaService,
) *UploadTokenService {
	return &UploadTokenService{sftpgo: sftpgo, folders: folders, users: users, quota: quota}
}

type UploadTokenFileIn struct {
	Name         string `json:"name"`
	Size         int64  `json:"size"`
	RelativePath string `json:"relative_path,omitempty"`
}

type UploadTokenFileOut struct {
	Name string `json:"name"`
	Mode string `json:"mode"` // sftpgo | s3
	Path string `json:"path"` // virtual SFTPGo path or unused for s3
	Size int64  `json:"size"`
}

type UploadTokenResult struct {
	Token         string               `json:"token"`
	ExpiresIn     int                  `json:"expires_in"`
	UploadURLBase string               `json:"uploadUrlBase"`
	FolderID      *uint                `json:"folder_id"`
	Files         []UploadTokenFileOut `json:"files"`
}

// MintToken ACL-checks folder, ensures SFTPGo user, returns JWT + virtual paths.
func (s *UploadTokenService) MintToken(ctx context.Context, userID uint, isAdmin bool, folderID *uint, files []UploadTokenFileIn) (*UploadTokenResult, error) {
	if s.sftpgo == nil || !s.sftpgo.Enabled() {
		return nil, fmt.Errorf("SFTPGo upload hot path disabled (set SFTPGO_INTEGRATION_ENABLED=true)")
	}
	if len(files) == 0 {
		return nil, fmt.Errorf("files required")
	}
	if folderID != nil {
		if err := s.folders.CanAccess(*folderID, userID, isAdmin); err != nil {
			return nil, fmt.Errorf("folder inaccessible")
		}
	}

	var totalBytes int64
	for _, f := range files {
		if strings.TrimSpace(f.Name) == "" {
			return nil, fmt.Errorf("file name required")
		}
		if f.Size <= 0 {
			return nil, fmt.Errorf("invalid size for %s", f.Name)
		}
		if err := ValidateResumableUploadMeta(f.Name, "application/octet-stream", f.Size); err != nil {
			return nil, err
		}
		totalBytes += f.Size
	}
	if s.quota != nil {
		if err := s.quota.CheckStorage(ctx, userID, totalBytes); err != nil {
			return nil, err
		}
	}

	user, err := s.users.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}
	username := SFTPUsernameFromEmail(user.Email)
	if err := s.sftpgo.EnsureUploadUser(ctx, username, userID); err != nil {
		return nil, fmt.Errorf("ensure sftpgo user: %w", err)
	}

	threshold := uploadSFTPGoMaxBytes()
	outFiles := make([]UploadTokenFileOut, 0, len(files))
	for _, f := range files {
		rel, err := sanitizeUploadRelativePath(f.RelativePath, f.Name)
		if err != nil {
			return nil, err
		}
		mode := "sftpgo"
		if threshold > 0 && f.Size > threshold {
			mode = "s3" // MPU fallback reserved; not minted here
		}
		vpath := buildVirtualUploadPath(folderID, rel)
		outFiles = append(outFiles, UploadTokenFileOut{
			Name: f.Name,
			Mode: mode,
			Path: vpath,
			Size: f.Size,
		})
	}

	token, expiresIn, err := s.sftpgo.ImpersonateUserJWT(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("mint sftpgo jwt: %w", err)
	}

	return &UploadTokenResult{
		Token:         token,
		ExpiresIn:     expiresIn,
		UploadURLBase: s.sftpgo.PublicURL(),
		FolderID:      folderID,
		Files:         outFiles,
	}, nil
}

// RefreshToken re-mints JWT for mid-batch 401 recovery.
func (s *UploadTokenService) RefreshToken(ctx context.Context, userID uint) (token string, expiresIn int, uploadURLBase string, err error) {
	if s.sftpgo == nil || !s.sftpgo.Enabled() {
		return "", 0, "", fmt.Errorf("SFTPGo upload hot path disabled")
	}
	user, err := s.users.GetByID(userID)
	if err != nil {
		return "", 0, "", fmt.Errorf("user not found")
	}
	username := SFTPUsernameFromEmail(user.Email)
	if err := s.sftpgo.EnsureUploadUser(ctx, username, userID); err != nil {
		return "", 0, "", err
	}
	token, expiresIn, err = s.sftpgo.ImpersonateUserJWT(ctx, username)
	if err != nil {
		return "", 0, "", err
	}
	return token, expiresIn, s.sftpgo.PublicURL(), nil
}

func uploadSFTPGoMaxBytes() int64 {
	raw := strings.TrimSpace(os.Getenv("UPLOAD_SFTPGO_MAX_BYTES"))
	if raw == "" || raw == "0" {
		return 0
	}
	if n, err := strconv.ParseInt(raw, 10, 64); err == nil && n > 0 {
		return n
	}
	return 0
}

func sanitizeUploadRelativePath(rel, fileName string) (string, error) {
	name := filepath.Base(strings.TrimSpace(fileName))
	if name == "" || name == "." || name == ".." {
		return "", fmt.Errorf("invalid file name")
	}
	rel = strings.TrimSpace(rel)
	if rel == "" {
		return name, nil
	}
	rel = strings.ReplaceAll(rel, "\\", "/")
	parts := strings.Split(rel, "/")
	clean := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" || p == "." {
			continue
		}
		if p == ".." {
			return "", fmt.Errorf("path traversal rejected")
		}
		if strings.ContainsAny(p, "\x00") {
			return "", fmt.Errorf("invalid path segment")
		}
		clean = append(clean, p)
	}
	if len(clean) == 0 {
		return name, nil
	}
	// If relative already ends with filename, use as-is; else join
	last := clean[len(clean)-1]
	if last != name && !strings.EqualFold(last, name) {
		clean = append(clean, name)
	}
	if len(clean) > 32 {
		return "", fmt.Errorf("path too deep")
	}
	return path.Join(clean...), nil
}

func buildVirtualUploadPath(folderID *uint, rel string) string {
	rel = strings.TrimPrefix(rel, "/")
	if folderID == nil {
		return path.Join("/uploads", rel)
	}
	return path.Join(VirtualFolderRoot(*folderID), rel)
}

// ParseFolderIDFromVirtualPath extracts folder ID from /folders/{id}/... paths.
func ParseFolderIDFromVirtualPath(virtualPath string) *uint {
	v := strings.TrimPrefix(path.Clean("/"+strings.TrimSpace(virtualPath)), "/")
	parts := strings.Split(v, "/")
	if len(parts) < 2 || parts[0] != "folders" {
		return nil
	}
	id, err := strconv.ParseUint(parts[1], 10, 64)
	if err != nil || id == 0 {
		return nil
	}
	u := uint(id)
	return &u
}

// UseSFTPGoHotPath returns true when browser should stream via SFTPGo (default).
func UseSFTPGoHotPath() bool {
	if !(strings.EqualFold(strings.TrimSpace(os.Getenv("SFTPGO_INTEGRATION_ENABLED")), "true") ||
		os.Getenv("SFTPGO_INTEGRATION_ENABLED") == "1") {
		return false
	}
	return true
}

// PreferSFTPGoForSize true when file should use SFTPGo (not MPU).
func PreferSFTPGoForSize(size int64) bool {
	if !UseSFTPGoHotPath() {
		return false
	}
	th := uploadSFTPGoMaxBytes()
	if th <= 0 {
		return true
	}
	return size <= th
}