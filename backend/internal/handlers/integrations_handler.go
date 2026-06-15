package handlers

import (
	"net/http"
	"os"

	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type IntegrationsHandler struct {
	pydio *services.PydioIntegrationService
	sync  *services.UserPydioSync
}

func NewIntegrationsHandler(pydio *services.PydioIntegrationService, sync *services.UserPydioSync) *IntegrationsHandler {
	return &IntegrationsHandler{pydio: pydio, sync: sync}
}

func pydioEnvConfig() map[string]any {
	cellsURL := os.Getenv("PYDIO_CELLS_URL")
	if cellsURL == "" {
		cellsURL = "http://localhost:4001"
	}
	webdavURL := os.Getenv("PYDIO_WEBDAV_URL")
	if webdavURL == "" {
		webdavURL = cellsURL + "/dav"
	}
	archiveAPI := os.Getenv("CELLS_ARCHIVE_API_BASE_URL")
	if archiveAPI == "" {
		archiveAPI = "http://localhost:5010"
	}
	return map[string]any{
		"cells_url":                  cellsURL,
		"webdav_url":                 webdavURL,
		"archive_api_base_url":       archiveAPI,
		"archives_requests_endpoint": archiveAPI + "/api/v1/archives-requests",
	}
}

// GetPydioConfig GET /api/integrations/pydio
func (h *IntegrationsHandler) GetPydioConfig(c echo.Context) error {
	data := pydioEnvConfig()
	ssoEnabled := h.pydio != nil && h.pydio.Enabled()
	data["sso_enabled"] = ssoEnabled
	if ssoEnabled {
		data["sso_note"] = "Connexion SSO : compte Cells créé automatiquement à l'inscription."
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": data})
}

// PydioSSOLaunch GET /api/integrations/pydio/sso-launch
func (h *IntegrationsHandler) PydioSSOLaunch(c echo.Context) error {
	if h.pydio == nil || !h.pydio.Enabled() {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "pydio integration disabled",
		})
	}
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	launchURL, err := h.sync.SSOLaunchURL(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusBadGateway, map[string]any{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success":    true,
		"launch_url": launchURL,
	})
}
