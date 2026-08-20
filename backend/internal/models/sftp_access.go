package models

import "strings"

// Modes canal SFTP (capabilities — pas des rôles UI).
const (
	SftpModeNone  = "none"
	SftpModeDrop  = "drop"
	SftpModeInbox = "inbox"
	SftpModeFull  = "full"
)

// NormalizeSftpMode mappe une valeur libre vers un mode connu.
func NormalizeSftpMode(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case SftpModeDrop:
		return SftpModeDrop
	case SftpModeInbox:
		return SftpModeInbox
	case SftpModeFull:
		return SftpModeFull
	case SftpModeNone, "":
		return SftpModeNone
	default:
		return SftpModeNone
	}
}

// DefaultSftpForRole retourne (enabled, mode) recommandés à la création d'un user.
func DefaultSftpForRole(role string) (enabled bool, mode string) {
	switch role {
	case RoleUser, RoleManager, RoleArchivist:
		return true, SftpModeDrop
	default:
		return false, SftpModeNone
	}
}

// ApplyDefaultSftpIfUnset remplit SftpEnabled/SftpMode à la création.
func ApplyDefaultSftpIfUnset(u *User, role string, explicitEnabled *bool, explicitMode *string) {
	if u == nil {
		return
	}
	defEn, defMode := DefaultSftpForRole(role)
	if explicitEnabled != nil {
		u.SftpEnabled = *explicitEnabled
	} else {
		u.SftpEnabled = defEn
	}
	if explicitMode != nil && strings.TrimSpace(*explicitMode) != "" {
		u.SftpMode = NormalizeSftpMode(*explicitMode)
	} else if u.SftpEnabled {
		u.SftpMode = defMode
		if u.SftpMode == SftpModeNone {
			u.SftpMode = SftpModeDrop
		}
	} else {
		// Désactivé : conserver un mode neutre (none). Re-enable utilisera DefaultSftpForRole.
		u.SftpMode = SftpModeNone
	}
}
