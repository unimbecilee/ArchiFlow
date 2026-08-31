-- Baseline : amorce le versionnage SQL (golang-migrate).
-- Le schema existant est toujours cree par GORM AutoMigrate jusqu'a la bascule complete.
-- A partir de 000002, toute modification DDL passe par des fichiers de migration.
CREATE TABLE IF NOT EXISTS schema_migrations_notes (
    id BIGSERIAL PRIMARY KEY,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations_notes(note) VALUES ('000001 baseline - schema gere par GORM AutoMigrate');
