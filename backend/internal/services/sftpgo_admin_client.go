package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// SftpGoAdminClient appelle l'API REST admin SFTPGo pour provisionner des users.
type SftpGoAdminClient struct {
	baseURL  string
	adminUser string
	adminPass string
	enabled  bool
	client   *http.Client
}

func NewSftpGoAdminClient() *SftpGoAdminClient {
	enabled := strings.EqualFold(strings.TrimSpace(os.Getenv("SFTPGO_INTEGRATION_ENABLED")), "true") ||
		os.Getenv("SFTPGO_INTEGRATION_ENABLED") == "1"
	base := strings.TrimRight(os.Getenv("SFTPGO_INTERNAL_URL"), "/")
	if base == "" {
		base = "http://localhost:8082"
	}
	user := os.Getenv("SFTPGO_ADMIN_USER")
	if user == "" {
		user = "admin"
	}
	pass := os.Getenv("SFTPGO_ADMIN_PASSWORD")
	if pass == "" {
		pass = "Admin1234!"
	}
	return &SftpGoAdminClient{
		baseURL:   base,
		adminUser: user,
		adminPass: pass,
		enabled:   enabled,
		client: &http.Client{
			Timeout: 15 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        10,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}
}

func (c *SftpGoAdminClient) Enabled() bool { return c.enabled }

func (c *SftpGoAdminClient) adminToken(ctx context.Context) (string, error) {
	body, _ := json.Marshal(map[string]string{
		"username": c.adminUser,
		"password": c.adminPass,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/v2/token", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("sftpgo token: %s", string(b))
	}
	var out struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	return out.AccessToken, nil
}

// EnsureVirtualUser crée (ou ignore si existe) un utilisateur SFTPGo avec home S3 inbox.
// Pour external auth, SFTPGo peut créer l'utilisateur à la volée ; cette méthode sert M2M + bootstrap.
func (c *SftpGoAdminClient) EnsureVirtualUser(ctx context.Context, username, password, homePrefix string) error {
	if !c.enabled {
		return nil
	}
	token, err := c.adminToken(ctx)
	if err != nil {
		return err
	}
	payload := map[string]any{
		"status":   1,
		"username": username,
		"password": password,
		"home_dir": homePrefix,
		"permissions": map[string][]string{
			"/": {"list", "download", "upload", "create_dirs"},
		},
		"filesystem": map[string]any{
			"provider": 1, // S3
		},
	}
	b, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/v2/users", bytes.NewReader(b))
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
	if resp.StatusCode == http.StatusConflict || resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		return nil
	}
	body, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("sftpgo create user: %d %s", resp.StatusCode, string(body))
}

func (c *SftpGoAdminClient) DeleteUser(ctx context.Context, username string) error {
	if !c.enabled {
		return nil
	}
	token, err := c.adminToken(ctx)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, c.baseURL+"/api/v2/users/"+username, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}
