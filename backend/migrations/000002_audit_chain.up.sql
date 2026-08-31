-- Ajoute la chaîne de hash d'audit si la table existe déjà (GORM AutoMigrate).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_events'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64) NOT NULL DEFAULT '';
    ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS entry_hash VARCHAR(64) NOT NULL DEFAULT '';
  END IF;
END $$;
