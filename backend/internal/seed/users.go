package seed

import (
	"context"
	"log"
	"os"
	"strings"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/services"
	"archiflow/backend/internal/utils"

	"gorm.io/gorm"
)

func seedPasswordRequired(envKey string) (string, bool) {
	password := strings.TrimSpace(os.Getenv(envKey))
	if password == "" {
		if config.IsProduction() {
			log.Printf("seed skipped: %s required in production", envKey)
		} else {
			log.Printf("seed skipped: set %s to create seed user", envKey)
		}
		return "", false
	}
	return password, true
}

// DefaultAdmin creates the sole bootstrap superadmin if no admin exists.
// Other roles (manager, validator, archivist, user) are created via the admin UI.
func DefaultAdmin(db *gorm.DB, pydioSync *services.UserPydioSync) {
	var count int64
	db.Model(&models.User{}).Where("role = ?", "admin").Count(&count)
	if count > 0 {
		return
	}

	email := os.Getenv("SEED_ADMIN_EMAIL")
	if email == "" {
		email = "admin@archiflow.local"
	}
	password, ok := seedPasswordRequired("SEED_ADMIN_PASSWORD")
	if !ok {
		return
	}

	var existing models.User
	if err := db.Where("email = ?", email).First(&existing).Error; err == nil {
		if existing.Role != "admin" {
			_ = db.Model(&existing).Update("role", "admin").Error
			log.Printf("✅ Promoted %s to admin (superadmin)", email)
		}
		provisionExistingIfNeeded(context.Background(), pydioSync, &existing, password)
		return
	}

	hash, err := utils.HashPassword(password)
	if err != nil {
		log.Printf("seed admin: hash password: %v", err)
		return
	}

	u := &models.User{
		Email:              email,
		PasswordHash:       hash,
		FirstName:          "Super",
		LastName:           "Admin",
		Role:               "admin",
		IsActive:           true,
		MustChangePassword: true,
	}
	models.ApplyDefaultSftpIfUnset(u, models.RoleAdmin, nil, nil)
	if err := db.Create(u).Error; err != nil {
		log.Printf("seed admin: %v", err)
		return
	}
	if pydioSync != nil {
		if err := pydioSync.ProvisionOnCreate(context.Background(), u, password); err != nil {
			// Cells optional at first boot — keep ArchiFlow admin even if Pydio is down.
			log.Printf("seed admin: ArchiFlow OK, Pydio provision deferred: %v", err)
		}
	}
	log.Printf("✅ Default superadmin seeded: %s", email)
}

func provisionExistingIfNeeded(ctx context.Context, pydioSync *services.UserPydioSync, u *models.User, password string) {
	if pydioSync == nil || u.PydioPasswordEnc != "" {
		return
	}
	if err := pydioSync.ProvisionOnCreate(ctx, u, password); err != nil {
		log.Printf("seed pydio provision %s: %v", u.Email, err)
	}
}

// BackfillSftpDefaults active SFTP drop pour user/manager encore au zero-value post-migration.
// Ne touche pas : admin/validator/archivist, ni comptes déjà configurés (enabled OU mode ≠ none).
// Ainsi une désactivation admin (enabled=false + mode=drop conservé) n'est pas écrasée.
func BackfillSftpDefaults(db *gorm.DB) {
	_ = db.Model(&models.User{}).
		Where("role IN ? AND sftp_enabled = ? AND (sftp_mode = ? OR sftp_mode = ? OR sftp_mode IS NULL)",
			[]string{models.RoleUser, models.RoleManager}, false, models.SftpModeNone, "").
		Updates(map[string]any{
			"sftp_enabled": true,
			"sftp_mode":    models.SftpModeDrop,
		}).Error

	_ = db.Model(&models.User{}).
		Where("role IN ? AND (sftp_mode = ? OR sftp_mode IS NULL)",
			[]string{models.RoleAdmin, models.RoleValidator, models.RoleArchivist}, "").
		Update("sftp_mode", models.SftpModeNone).Error
}
