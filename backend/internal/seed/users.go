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

// DefaultAdmin creates admin user if no admin exists (dev/docker first boot).
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
			log.Printf("✅ Promoted %s to admin", email)
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
		FirstName:          "Admin",
		LastName:           "ArchiFlow",
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
			log.Printf("seed admin pydio: %v", err)
			_ = db.Delete(u).Error
			return
		}
	}
	log.Printf("✅ Default admin seeded: %s", email)
}

// DefaultManager crée un compte manager pour les workflows si absent.
func DefaultManager(db *gorm.DB, pydioSync *services.UserPydioSync) {
	email := os.Getenv("SEED_MANAGER_EMAIL")
	if email == "" {
		email = "manager@archiflow.local"
	}
	password, ok := seedPasswordRequired("SEED_MANAGER_PASSWORD")
	if !ok {
		return
	}
	var existing models.User
	if err := db.Where("email = ?", email).First(&existing).Error; err == nil {
		if existing.Role != "manager" {
			_ = db.Model(&existing).Update("role", "manager").Error
		}
		provisionExistingIfNeeded(context.Background(), pydioSync, &existing, password)
		return
	}
	hash, err := utils.HashPassword(password)
	if err != nil {
		return
	}
	u := &models.User{
		Email:              email,
		PasswordHash:       hash,
		FirstName:          "Manager",
		LastName:           "ArchiFlow",
		Role:               "manager",
		IsActive:           true,
		MustChangePassword: true,
	}
	models.ApplyDefaultSftpIfUnset(u, models.RoleManager, nil, nil)
	if err := db.Create(u).Error; err != nil {
		return
	}
	if pydioSync != nil {
		if err := pydioSync.ProvisionOnCreate(context.Background(), u, password); err != nil {
			log.Printf("seed manager pydio: %v", err)
			_ = db.Delete(u).Error
			return
		}
	}
	log.Printf("✅ Default manager seeded: %s", email)
}

func seedRoleUser(db *gorm.DB, pydioSync *services.UserPydioSync, email, password, firstName, lastName, role string) {
	if email == "" || password == "" {
		return
	}
	var existing models.User
	if err := db.Where("email = ?", email).First(&existing).Error; err == nil {
		if existing.Role != role {
			_ = db.Model(&existing).Update("role", role).Error
		}
		provisionExistingIfNeeded(context.Background(), pydioSync, &existing, password)
		return
	}
	hash, err := utils.HashPassword(password)
	if err != nil {
		return
	}
	u := &models.User{
		Email:              email,
		PasswordHash:       hash,
		FirstName:          firstName,
		LastName:           "ArchiFlow",
		Role:               role,
		IsActive:           true,
		MustChangePassword: true,
	}
	models.ApplyDefaultSftpIfUnset(u, role, nil, nil)
	if err := db.Create(u).Error; err != nil {
		return
	}
	if pydioSync != nil {
		if err := pydioSync.ProvisionOnCreate(context.Background(), u, password); err != nil {
			log.Printf("seed %s pydio: %v", role, err)
			_ = db.Delete(u).Error
			return
		}
	}
	log.Printf("✅ Default %s seeded: %s", role, email)
}

// DefaultValidator compte validateur dedie (approbations workflow).
func DefaultValidator(db *gorm.DB, pydioSync *services.UserPydioSync) {
	email := os.Getenv("SEED_VALIDATOR_EMAIL")
	if email == "" {
		email = "validator@archiflow.local"
	}
	password, ok := seedPasswordRequired("SEED_VALIDATOR_PASSWORD")
	if !ok {
		return
	}
	seedRoleUser(db, pydioSync, email, password, "Validateur", "", models.RoleValidator)
}

// DefaultArchivist compte archiviste (lecture org + workflows termines).
func DefaultArchivist(db *gorm.DB, pydioSync *services.UserPydioSync) {
	email := os.Getenv("SEED_ARCHIVIST_EMAIL")
	if email == "" {
		email = "archivist@archiflow.local"
	}
	password, ok := seedPasswordRequired("SEED_ARCHIVIST_PASSWORD")
	if !ok {
		return
	}
	seedRoleUser(db, pydioSync, email, password, "Archiviste", "", models.RoleArchivist)
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
