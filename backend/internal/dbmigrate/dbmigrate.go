package dbmigrate

import (
	"errors"
	"fmt"
	"io/fs"

	"github.com/golang-migrate/migrate/v4"
	ipostgres "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"gorm.io/gorm"
)

var ErrNoChange = migrate.ErrNoChange

type Manager struct {
	m *migrate.Migrate
}

func New(db *gorm.DB, fsys fs.FS) (*Manager, error) {
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("sql db: %w", err)
	}
	drv, err := ipostgres.WithInstance(sqlDB, &ipostgres.Config{})
	if err != nil {
		return nil, fmt.Errorf("postgres driver: %w", err)
	}
	src, err := iofs.New(fsys, ".")
	if err != nil {
		return nil, fmt.Errorf("iofs source: %w", err)
	}
	m, err := migrate.NewWithInstance("iofs", src, "postgres", drv)
	if err != nil {
		return nil, fmt.Errorf("migrate instance: %w", err)
	}
	return &Manager{m: m}, nil
}

func (m *Manager) Up() error {
	return m.m.Up()
}

func (m *Manager) Down(steps int) error {
	if steps <= 0 {
		return fmt.Errorf("steps must be positive, got %d", steps)
	}
	return m.m.Steps(-steps)
}

func (m *Manager) Version() (uint, bool, error) {
	v, dirty, err := m.m.Version()
	if errors.Is(err, migrate.ErrNilVersion) {
		return 0, false, nil
	}
	return v, dirty, err
}

// ForceCleanDirty clears a failed migration lock so Up() can retry.
// Safe for first-boot / dirty version after a partial SQL failure.
func (m *Manager) ForceCleanDirty() (wasDirty bool, err error) {
	v, dirty, err := m.m.Version()
	if errors.Is(err, migrate.ErrNilVersion) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if !dirty {
		return false, nil
	}
	// Force to previous version so the failed migration re-runs.
	prev := int(v) - 1
	if prev < 0 {
		prev = -1 // nil version
	}
	if err := m.m.Force(prev); err != nil {
		return true, fmt.Errorf("force version %d: %w", prev, err)
	}
	return true, nil
}
