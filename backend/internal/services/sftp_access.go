package services

import (
	"strings"

	"archiflow/backend/internal/models"
)

// humanSftpAccess décide si un humain peut ouvrir une session SFTP et sous quel mode.
func humanSftpAccess(u *models.User) (ok bool, mode string) {
	if u == nil || !u.IsActive {
		return false, models.SftpModeNone
	}
	if !u.SftpEnabled {
		return false, models.SftpModeNone
	}
	if strings.TrimSpace(u.SftpMode) == "" {
		_, mode = models.DefaultSftpForRole(u.Role)
	} else {
		mode = models.NormalizeSftpMode(u.SftpMode)
	}
	if mode == models.SftpModeNone {
		return false, models.SftpModeNone
	}
	return true, mode
}

// serviceAccountSftpMode: M2M = drop (défaut) ou full. inbox → drop.
func serviceAccountSftpMode(sa *models.ServiceAccount) string {
	if sa == nil {
		return models.SftpModeDrop
	}
	m := models.NormalizeSftpMode(sa.SftpMode)
	switch m {
	case models.SftpModeFull:
		return models.SftpModeFull
	default:
		return models.SftpModeDrop
	}
}

// sftpPermissionsForMode mappe le mode ArchiFlow → permissions SFTPGo.
func sftpPermissionsForMode(mode string) map[string][]string {
	switch models.NormalizeSftpMode(mode) {
	case models.SftpModeDrop:
		return map[string][]string{
			"/": {"upload", "create_dirs"},
		}
	case models.SftpModeInbox:
		return map[string][]string{
			"/": {"list", "upload", "download"},
		}
	case models.SftpModeFull:
		return map[string][]string{
			"/": {"list", "download", "upload", "create_dirs"},
		}
	default:
		return nil
	}
}
