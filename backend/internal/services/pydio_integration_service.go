package services

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// PydioIntegrationService — provision + SSO Cells (pattern socle).
type PydioIntegrationService struct {
	publicURL  string
	apiURL     string
	adminLogin string
	adminPass  string
	enabled    bool
}

func NewPydioIntegrationService() *PydioIntegrationService {
	public := os.Getenv("PYDIO_CELLS_URL")
	if public == "" {
		public = "http://localhost:4001"
	}
	api := os.Getenv("PYDIO_CELLS_INTERNAL_URL")
	if api == "" {
		api = public
	}
	adminLogin := os.Getenv("PYDIO_ADMIN_LOGIN")
	if adminLogin == "" {
		adminLogin = "superadmin"
	}
	adminPass := os.Getenv("PYDIO_ADMIN_PASSWORD")
	if adminPass == "" {
		adminPass = "superadmin"
	}
	enabled := os.Getenv("PYDIO_INTEGRATION_ENABLED") != "false"
	return &PydioIntegrationService{
		publicURL:  strings.TrimRight(public, "/"),
		apiURL:     strings.TrimRight(api, "/"),
		adminLogin: adminLogin,
		adminPass:  adminPass,
		enabled:    enabled,
	}
}

func (s *PydioIntegrationService) Enabled() bool { return s.enabled }

// ProvisionUser crée l'utilisateur Cells (email = login).
func (s *PydioIntegrationService) ProvisionUser(ctx context.Context, email, password string) (externalID string, err error) {
	return s.putUser(ctx, email, password, "")
}

// UpdateUserPassword met à jour le mot de passe d'un utilisateur Cells existant (Uuid requis).
func (s *PydioIntegrationService) UpdateUserPassword(ctx context.Context, email, password, pydioUUID string) error {
	if !s.enabled {
		return nil
	}
	if pydioUUID == "" {
		return fmt.Errorf("pydio user uuid missing for %s", email)
	}
	_, err := s.putUser(ctx, email, password, pydioUUID)
	return err
}

func (s *PydioIntegrationService) putUser(ctx context.Context, email, password, pydioUUID string) (externalID string, err error) {
	if !s.enabled {
		return "", nil
	}
	token, err := s.adminSession(ctx)
	if err != nil {
		return "", err
	}
	body := map[string]any{
		"Login":    email,
		"Password": password,
		"Attributes": map[string]string{
			"profile": "standard",
		},
	}
	if pydioUUID != "" {
		body["Uuid"] = pydioUUID
	}
	payload, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, s.apiURL+"/a/user/"+url.PathEscape(email), bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := s.httpClient().Do(req)
	if err != nil {
		return "", fmt.Errorf("pydio put user: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("pydio put user status %d: %s", resp.StatusCode, string(respBody))
	}
	var userResp struct {
		Uuid string `json:"Uuid"`
	}
	if err := json.Unmarshal(respBody, &userResp); err != nil {
		return "", fmt.Errorf("pydio put user response: %w", err)
	}
	if userResp.Uuid != "" {
		return userResp.Uuid, nil
	}
	return email, nil
}

// DeleteUser supprime l'utilisateur Cells.
func (s *PydioIntegrationService) DeleteUser(ctx context.Context, email string) error {
	if !s.enabled || email == "" {
		return nil
	}
	token, err := s.adminSession(ctx)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, s.apiURL+"/a/user/"+url.PathEscape(email), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := s.httpClient().Do(req)
	if err != nil {
		return fmt.Errorf("pydio delete user: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusNotFound {
		return nil
	}
	b, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("pydio delete user status %d: %s", resp.StatusCode, string(b))
}

// BuildSSOLaunchURL session Cells + page storage (comme socle).
func (s *PydioIntegrationService) BuildSSOLaunchURL(ctx context.Context, email, pydioPassword string) (string, error) {
	if !s.enabled {
		return "", fmt.Errorf("pydio integration disabled")
	}
	tokenData, err := s.userSession(ctx, email, pydioPassword)
	if err != nil {
		return "", err
	}
	raw, _ := json.Marshal(tokenData)
	encoded := base64.StdEncoding.EncodeToString(raw)
	return s.publicURL + "/auth/sso-storage.html?token=" + url.QueryEscape(encoded), nil
}

func (s *PydioIntegrationService) userSession(ctx context.Context, email, password string) (map[string]interface{}, error) {
	loginURL := s.apiURL + "/a/frontend/session"
	payload := map[string]interface{}{
		"AuthInfo": map[string]string{
			"type":     "credentials",
			"login":    email,
			"password": password,
		},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, loginURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	resp, err := s.httpClient().Do(req)
	if err != nil {
		return nil, fmt.Errorf("cells session: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("cells auth status %d: %s", resp.StatusCode, string(respBody))
	}
	var sessionResp map[string]interface{}
	if err := json.Unmarshal(respBody, &sessionResp); err != nil {
		return nil, err
	}
	if token, ok := sessionResp["Token"].(map[string]interface{}); ok && token != nil {
		return token, nil
	}
	if jwt, ok := sessionResp["JWT"].(string); ok && jwt != "" {
		return map[string]interface{}{
			"IDToken":     jwt,
			"AccessToken": jwt,
			"ExpiresAt":   time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		}, nil
	}
	return nil, fmt.Errorf("no token in cells response")
}

func (s *PydioIntegrationService) adminSession(ctx context.Context) (string, error) {
	tokenData, err := s.userSession(ctx, s.adminLogin, s.adminPass)
	if err != nil {
		return "", fmt.Errorf("pydio admin session: %w", err)
	}
	if jwt, ok := tokenData["AccessToken"].(string); ok && jwt != "" {
		return jwt, nil
	}
	if jwt, ok := tokenData["IDToken"].(string); ok && jwt != "" {
		return jwt, nil
	}
	return "", fmt.Errorf("no admin token from cells")
}

func (s *PydioIntegrationService) httpClient() *http.Client {
	return &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}
}
