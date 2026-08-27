package services

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"archiflow/backend/internal/config"
)

// SFTPGoUploadClient provisions SFTPGo users (S3 documents bucket) and mints user JWTs
// for browser → SFTPGo → MinIO streaming uploads (hot path).
type SFTPGoUploadClient struct {
	baseURL        string
	publicURL      string
	adminUser      string
	adminPass      string
	pwdSecret      string
	documentsBucket string
	minioEndpoint  string
	minioAccessKey string
	minioSecretKey string
	minioUseSSL    bool
	enabled        bool
	client         *http.Client
}

func NewSFTPGoUploadClient() *SFTPGoUploadClient {
	enabled := strings.EqualFold(strings.TrimSpace(os.Getenv("SFTPGO_INTEGRATION_ENABLED")), "true") ||
		os.Getenv("SFTPGO_INTEGRATION_ENABLED") == "1"
	base := strings.TrimRight(os.Getenv("SFTPGO_INTERNAL_URL"), "/")
	if base == "" {
		base = "http://sftpgo:8080"
	}
	pub := strings.TrimRight(os.Getenv("SFTPGO_PUBLIC_URL"), "/")
	if pub == "" {
		pub = "http://localhost:8088"
	}
	endpoint := os.Getenv("MINIO_ENDPOINT")
	if endpoint == "" {
		endpoint = "minio:9000"
	}
	access := os.Getenv("MINIO_SFTP_ACCESS_KEY")
	secret := os.Getenv("MINIO_SFTP_SECRET_KEY")
	if access == "" {
		access = os.Getenv("MINIO_ACCESS_KEY")
	}
	if secret == "" {
		secret = os.Getenv("MINIO_SECRET_KEY")
	}
	bucket := os.Getenv("MINIO_DOCUMENTS_BUCKET")
	if bucket == "" {
		bucket = "archiflow-documents"
	}
	pwdSecret := strings.TrimSpace(os.Getenv("SFTPGO_USER_PASSWORD_SECRET"))
	adminUser := os.Getenv("SFTPGO_ADMIN_USER")
	if adminUser == "" {
		adminUser = "admin"
	}
	adminPass := os.Getenv("SFTPGO_ADMIN_PASSWORD")
	if enabled && (access == "" || secret == "" || pwdSecret == "" || adminPass == "") {
		enabled = false
	}
	return &SFTPGoUploadClient{
		baseURL:         base,
		publicURL:       pub,
		adminUser:       adminUser,
		adminPass:       adminPass,
		pwdSecret:       pwdSecret,
		documentsBucket: bucket,
		minioEndpoint:   endpoint,
		minioAccessKey:  access,
		minioSecretKey:  secret,
		minioUseSSL:     strings.EqualFold(os.Getenv("MINIO_USE_SSL"), "true"),
		enabled:         enabled,
		client: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        20,
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}
}

func (c *SFTPGoUploadClient) Enabled() bool { return c != nil && c.enabled }

func (c *SFTPGoUploadClient) PublicURL() string {
	if c == nil {
		return "http://localhost:8088"
	}
	return c.publicURL
}

// UserPassword returns deterministic password for SFTPGo web-upload users.
func (c *SFTPGoUploadClient) UserPassword(username string) string {
	mac := hmac.New(sha256.New, []byte(c.pwdSecret))
	mac.Write([]byte(strings.ToLower(strings.TrimSpace(username))))
	return hex.EncodeToString(mac.Sum(nil))[:32]
}

// SFTPUsernameFromEmail maps ArchiFlow email → SFTPGo username (email lowercased).
func SFTPUsernameFromEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// VirtualFolderRoot returns SFTPGo virtual path root for a GED folder.
func VirtualFolderRoot(folderID uint) string {
	return path.Join("/folders", strconv.FormatUint(uint64(folderID), 10))
}

func (c *SFTPGoUploadClient) keyPrefix(ownerID uint) string {
	return path.Join("users", strconv.FormatUint(uint64(ownerID), 10)) + "/"
}

func (c *SFTPGoUploadClient) documentsFilesystem(ownerID uint) map[string]any {
	endpoint := c.minioEndpoint
	if !strings.HasPrefix(endpoint, "http://") && !strings.HasPrefix(endpoint, "https://") {
		scheme := "http://"
		if c.minioUseSSL {
			scheme = "https://"
		}
		endpoint = scheme + endpoint
	}
	return map[string]any{
		"provider": 1,
		"s3config": map[string]any{
			"bucket":             c.documentsBucket,
			"region":             "us-east-1",
			"access_key":         c.minioAccessKey,
			"access_secret":      map[string]any{"status": "Plain", "payload": c.minioSecretKey},
			"endpoint":           endpoint,
			"force_path_style":   true,
			"key_prefix":         c.keyPrefix(ownerID),
			"upload_part_size":   sftpUploadPartSizeMB(),
			"upload_concurrency": sftpUploadConcurrency(),
			"skip_tls_verify":    !c.minioUseSSL,
		},
	}
}

func (c *SFTPGoUploadClient) adminToken(ctx context.Context) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/v2/token", nil)
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(c.adminUser, c.adminPass)
	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("sftpgo admin token: %s: %s", resp.Status, string(body))
	}
	var out struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", err
	}
	return out.AccessToken, nil
}

func (c *SFTPGoUploadClient) userPayload(username string, ownerID uint) map[string]any {
	return map[string]any{
		"status":   1,
		"username": username,
		"password": c.UserPassword(username),
		"home_dir": "/var/lib/sftpgo/data/" + username,
		"permissions": map[string][]string{
			"/": {"list", "upload", "create_dirs", "rename", "delete"},
		},
		"filesystem": c.documentsFilesystem(ownerID),
	}
}

// EnsureUploadUser creates/updates SFTPGo user with documents-bucket S3 home.
func (c *SFTPGoUploadClient) EnsureUploadUser(ctx context.Context, username string, ownerID uint) error {
	if !c.Enabled() {
		return fmt.Errorf("SFTPGo integration disabled")
	}
	username = SFTPUsernameFromEmail(username)
	if username == "" || ownerID == 0 {
		return fmt.Errorf("invalid username or owner")
	}
	token, err := c.adminToken(ctx)
	if err != nil {
		return err
	}
	payload, _ := json.Marshal(c.userPayload(username, ownerID))

	// Try update first
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, c.baseURL+"/api/v2/users/"+username, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return nil
	}
	if resp.StatusCode != http.StatusNotFound {
		b, _ := io.ReadAll(resp.Body)
		// fall through to create on 404 only; other errors try create
		if resp.StatusCode != http.StatusBadRequest {
			_ = b
		}
	}

	req2, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/v2/users", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+token)
	resp2, err := c.client.Do(req2)
	if err != nil {
		return err
	}
	defer resp2.Body.Close()
	if resp2.StatusCode == http.StatusCreated || resp2.StatusCode == http.StatusOK || resp2.StatusCode == http.StatusConflict {
		// Conflict: re-PUT
		if resp2.StatusCode == http.StatusConflict {
			req3, _ := http.NewRequestWithContext(ctx, http.MethodPut, c.baseURL+"/api/v2/users/"+username, bytes.NewReader(payload))
			req3.Header.Set("Content-Type", "application/json")
			req3.Header.Set("Authorization", "Bearer "+token)
			resp3, err := c.client.Do(req3)
			if err != nil {
				return err
			}
			defer resp3.Body.Close()
			if resp3.StatusCode != http.StatusOK {
				b, _ := io.ReadAll(resp3.Body)
				return fmt.Errorf("sftpgo update user: %d %s", resp3.StatusCode, string(b))
			}
		}
		return nil
	}
	b, _ := io.ReadAll(resp2.Body)
	return fmt.Errorf("sftpgo create user: %d %s", resp2.StatusCode, string(b))
}

// ImpersonateUserJWT mints a short-lived SFTPGo user JWT for browser uploads.
func (c *SFTPGoUploadClient) ImpersonateUserJWT(ctx context.Context, username string) (token string, expiresIn int, err error) {
	if !c.Enabled() {
		return "", 0, fmt.Errorf("SFTPGo integration disabled")
	}
	username = SFTPUsernameFromEmail(username)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/v2/user/token", nil)
	if err != nil {
		return "", 0, err
	}
	req.SetBasicAuth(username, c.UserPassword(username))
	resp, err := c.client.Do(req)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", 0, fmt.Errorf("sftpgo user token: %s: %s", resp.Status, string(body))
	}
	var tr struct {
		AccessToken string `json:"access_token"`
		ExpiresAt   int64  `json:"expires_at"`
	}
	if err := json.Unmarshal(body, &tr); err != nil {
		return "", 0, err
	}
	expiresIn = 7200
	if tr.ExpiresAt > 0 {
		remaining := int(tr.ExpiresAt - time.Now().Unix())
		if remaining > 0 {
			expiresIn = remaining
		}
	}
	return tr.AccessToken, expiresIn, nil
}

// DocumentsBucket returns the MinIO documents bucket used for hot-path uploads.
func (c *SFTPGoUploadClient) DocumentsBucket() string {
	if c == nil || c.documentsBucket == "" {
		return config.SFTPInboxBucket()
	}
	return c.documentsBucket
}
