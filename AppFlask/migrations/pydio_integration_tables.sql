-- Migration: Tables d'intégration Pydio Cells - ArchiFlow
-- Date: 2026-03-18

-- Table des demandes d'archivage depuis Pydio
CREATE TABLE IF NOT EXISTS pydio_archive_request (
    id SERIAL PRIMARY KEY,
    pydio_document_id VARCHAR(255) NOT NULL,
    document_name VARCHAR(500) NOT NULL,
    workspace VARCHAR(255) DEFAULT 'Common Files',
    path VARCHAR(1000) DEFAULT '/',
    pydio_user VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    metadata TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed')),
    archiflow_document_id INTEGER REFERENCES document(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES utilisateur(id) ON DELETE SET NULL,
    processed_by INTEGER REFERENCES utilisateur(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    processed_at TIMESTAMP,
    rejection_reason TEXT
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_pydio_archive_request_status ON pydio_archive_request(status);
CREATE INDEX IF NOT EXISTS idx_pydio_archive_request_pydio_doc ON pydio_archive_request(pydio_document_id);
CREATE INDEX IF NOT EXISTS idx_pydio_archive_request_created ON pydio_archive_request(created_at DESC);

-- Table de synchronisation des documents Pydio
CREATE TABLE IF NOT EXISTS pydio_document_sync (
    id SERIAL PRIMARY KEY,
    pydio_node_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    path VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(255),
    size BIGINT DEFAULT 0,
    workspace VARCHAR(255) DEFAULT 'Common Files',
    metadata TEXT,
    archiflow_document_id INTEGER REFERENCES document(id) ON DELETE SET NULL,
    sync_status VARCHAR(50) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
    last_sync_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_pydio_document_sync_node ON pydio_document_sync(pydio_node_id);
CREATE INDEX IF NOT EXISTS idx_pydio_document_sync_path ON pydio_document_sync(path);
CREATE INDEX IF NOT EXISTS idx_pydio_document_sync_workspace ON pydio_document_sync(workspace);

-- Table de log des webhooks Pydio
CREATE TABLE IF NOT EXISTS pydio_webhook_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    node_type VARCHAR(50),
    node_path VARCHAR(1000),
    node_name VARCHAR(500),
    payload TEXT,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les logs
CREATE INDEX IF NOT EXISTS idx_pydio_webhook_log_event ON pydio_webhook_log(event_type);
CREATE INDEX IF NOT EXISTS idx_pydio_webhook_log_created ON pydio_webhook_log(created_at DESC);

-- Commentaires sur les tables
COMMENT ON TABLE pydio_archive_request IS 'Demandes d''archivage provenant de Pydio Cells';
COMMENT ON TABLE pydio_document_sync IS 'Documents synchronisés entre Pydio Cells et ArchiFlow';
COMMENT ON TABLE pydio_webhook_log IS 'Log des webhooks reçus de Pydio Cells';

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_pydio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS trigger_pydio_archive_request_updated ON pydio_archive_request;
CREATE TRIGGER trigger_pydio_archive_request_updated
    BEFORE UPDATE ON pydio_archive_request
    FOR EACH ROW
    EXECUTE FUNCTION update_pydio_updated_at();

DROP TRIGGER IF EXISTS trigger_pydio_document_sync_updated ON pydio_document_sync;
CREATE TRIGGER trigger_pydio_document_sync_updated
    BEFORE UPDATE ON pydio_document_sync
    FOR EACH ROW
    EXECUTE FUNCTION update_pydio_updated_at();
