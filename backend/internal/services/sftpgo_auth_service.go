package services

import (
	"crypto/hmac"
	"fmt"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/utils"
)

// SftpGoAuthService — external auth hook SFTPGo.
type SftpGoAuthService struct {
	userRepo repository.UserRepository
	sftpRepo *repository.SftpRepository
	audit    *AuditService
}

func NewSftpGoAuthService(
	userRepo repository.UserRepository,
	sftpRepo *repository.SftpRepository,
	audit *AuditService,
) *SftpGoAuthService {
	return &SftpGoAuthService{userRepo: userRepo, sftpRepo: sftpRepo, audit: audit}
}

type SftpGoAuthRequest struct {
	Username string `json:"username" validate:"required,max=255"`
	Password string `json:"password" validate:"required"`
	IP       string `json:"ip" validate:"omitempty,max=64"`
	Protocol string `json:"protocol" validate:"omitempty,max=32"`
}

// SftpGoAuthResponse format attendu par SFTPGo external auth hook.
type SftpGoAuthResponse struct {
	Status      int                 `json:"status"`
	Username    string              `json:"username,omitempty"`
	HomeDir     string              `json:"home_dir,omitempty"`
	Permissions map[string][]string `json:"permissions,omitempty"`
	UID         int                 `json:"uid,omitempty"`
	GID         int                 `json:"gid,omitempty"`
	Filesystem  map[string]any      `json:"filesystem,omitempty"`
}

func (s *SftpGoAuthService) Authenticate(req SftpGoAuthRequest) (*SftpGoAuthResponse, error) {
	username := strings.ToLower(strings.TrimSpace(req.Username))
	if username == "" || req.Password == "" {
		return &SftpGoAuthResponse{Status: 0}, nil
	}

	var ownerID uint
	var actorEmail string
	var sftpMode string

	// 1) Service account M2M
	if sa, err := s.sftpRepo.FindServiceAccountBySftpUser(username); err == nil && sa != nil {
		if !sa.IsActive || !utils.VerifyPassword(req.Password, sa.PasswordHash) {
			s.logLogin(nil, username, req.IP, req.Protocol, false)
			return &SftpGoAuthResponse{Status: 0}, nil
		}
		u, err := s.userRepo.GetByID(sa.ArchiflowUserID)
		if err != nil || !u.IsActive {
			s.logLogin(nil, username, req.IP, req.Protocol, false)
			return &SftpGoAuthResponse{Status: 0}, nil
		}
		ownerID = u.ID
		actorEmail = username
		sftpMode = serviceAccountSftpMode(sa)
		now := time.Now()
		sa.LastUsedAt = &now
		_ = s.sftpRepo.UpdateServiceAccount(sa)
	} else {
		// 2) Humain ArchiFlow (email + bcrypt OR HMAC web-upload password)
		u, err := s.userRepo.GetByEmail(username)
		if err != nil || !u.IsActive {
			s.logLogin(nil, username, req.IP, req.Protocol, false)
			return &SftpGoAuthResponse{Status: 0}, nil
		}
		pwdOK := utils.VerifyPassword(req.Password, u.PasswordHash)
		if !pwdOK {
			uploadClient := NewSFTPGoUploadClient()
			// HMAC web-upload password only when SFTPGo upload integration is enabled.
			if uploadClient.Enabled() && hmac.Equal([]byte(req.Password), []byte(uploadClient.UserPassword(username))) {
				pwdOK = true
			}
		}
		if !pwdOK {
			s.logLogin(&u.ID, username, req.IP, req.Protocol, false)
			return &SftpGoAuthResponse{Status: 0}, nil
		}
		ok, mode := humanSftpAccess(u)
		// Web JWT path: HMAC password allows upload even if sftp_enabled false
		if !ok {
			uploadClient := NewSFTPGoUploadClient()
			if uploadClient.Enabled() && hmac.Equal([]byte(req.Password), []byte(uploadClient.UserPassword(username))) {
				ok = true
				mode = models.SftpModeFull
			}
		}
		if !ok {
			s.logLogin(&u.ID, u.Email, req.IP, req.Protocol, false)
			return &SftpGoAuthResponse{Status: 0}, nil
		}
		ownerID = u.ID
		actorEmail = u.Email
		sftpMode = mode
	}

	perms := sftpPermissionsForMode(sftpMode)
	if perms == nil {
		s.logLogin(&ownerID, actorEmail, req.IP, req.Protocol, false)
		return &SftpGoAuthResponse{Status: 0}, nil
	}

	fsCfg, ok := s3FilesystemConfig(ownerID)
	if !ok {
		s.logLogin(&ownerID, actorEmail, req.IP, req.Protocol, false)
		return &SftpGoAuthResponse{Status: 0}, nil
	}

	home := path.Join("/users", strconv.FormatUint(uint64(ownerID), 10))
	s.logLogin(&ownerID, actorEmail, req.IP, req.Protocol, true)

	return &SftpGoAuthResponse{
		Status:      1,
		Username:    username,
		HomeDir:     home,
		UID:         0,
		GID:         0,
		Permissions: perms,
		Filesystem:  fsCfg,
	}, nil
}

func (s *SftpGoAuthService) logLogin(actorID *uint, email, ip, protocol string, ok bool) {
	if s.audit == nil {
		return
	}
	action := "sftp.login.failed"
	if ok {
		action = "sftp.login.ok"
	}
	_ = s.audit.Log(models.AuditEvent{
		Source:        "sftpgo",
		ActorID:       actorID,
		ActorEmail:    email,
		Action:        action,
		IP:            ip,
		ResourceType:  "user",
		ResourceID:    email,
		CorrelationID: NewCorrelationID(),
		Metadata:      fmt.Sprintf(`{"protocol":%q}`, protocol),
	})
}

func s3FilesystemConfig(userID uint) (map[string]any, bool) {
	endpoint := os.Getenv("MINIO_ENDPOINT")
	if endpoint == "" {
		endpoint = "minio:9000"
	}
	access, secret, ok := sftpMinioCreds()
	if !ok {
		return nil, false
	}
	bucket := config.SFTPInboxBucket()
	keyPrefix := path.Join("users", strconv.FormatUint(uint64(userID), 10))
	useSSL := strings.EqualFold(os.Getenv("MINIO_USE_SSL"), "true")
	return map[string]any{
		"provider": 1,
		"s3config": map[string]any{
			"bucket":             bucket,
			"region":             "us-east-1",
			"access_key":         access,
			"access_secret":      secret,
			"endpoint":           endpoint,
			"force_path_style":   true,
			"key_prefix":         keyPrefix + "/",
			"storage_class":      "",
			"upload_part_size":   sftpUploadPartSizeMB(),
			"upload_concurrency": sftpUploadConcurrency(),
			"skip_tls_verify":    !useSSL,
		},
	}, true
}

// sftpMinioCreds prefers scoped inbox keys. Never falls back to root MinIO in production.
// Non-prod may fall back to MINIO_ACCESS_KEY/SECRET only when SFTPGO_ALLOW_ROOT_MINIO_CREDS=1.
func sftpMinioCreds() (access, secret string, ok bool) {
	access = strings.TrimSpace(os.Getenv("MINIO_SFTP_ACCESS_KEY"))
	secret = strings.TrimSpace(os.Getenv("MINIO_SFTP_SECRET_KEY"))
	if access != "" && secret != "" {
		return access, secret, true
	}
	if config.IsProduction() {
		return "", "", false
	}
	allowRoot := strings.EqualFold(strings.TrimSpace(os.Getenv("SFTPGO_ALLOW_ROOT_MINIO_CREDS")), "true") ||
		os.Getenv("SFTPGO_ALLOW_ROOT_MINIO_CREDS") == "1"
	if !allowRoot {
		return "", "", false
	}
	access = strings.TrimSpace(os.Getenv("MINIO_ACCESS_KEY"))
	secret = strings.TrimSpace(os.Getenv("MINIO_SECRET_KEY"))
	if access == "" || secret == "" {
		return "", "", false
	}
	return access, secret, true
}

func sftpUploadPartSizeMB() int {
	if raw := strings.TrimSpace(os.Getenv("SFTP_UPLOAD_PART_SIZE_MB")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n >= 5 {
			return n
		}
	}
	return 64
}

func sftpUploadConcurrency() int {
	if raw := strings.TrimSpace(os.Getenv("SFTP_UPLOAD_CONCURRENCY")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n >= 1 {
			return n
		}
	}
	return 8
}
