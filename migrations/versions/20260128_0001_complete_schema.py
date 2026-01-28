"""
Complete database schema for ESAG GED - All tables in one migration

Revision ID: 20260128_0001
Revises: 
Create Date: 2026-01-28
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260128_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ============================================================================
    # TABLES DE BASE - Utilisateurs, Organisations, Rôles
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS utilisateur (
            id BIGSERIAL PRIMARY KEY,
            nom VARCHAR(150),
            prenom VARCHAR(150),
            email VARCHAR(255) UNIQUE,
            mot_de_passe VARCHAR(255),
            role VARCHAR(50),
            categorie VARCHAR(50),
            numero_tel VARCHAR(50),
            actif BOOLEAN DEFAULT TRUE,
            organisation_id BIGINT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE TABLE IF NOT EXISTS organisation (
            id BIGSERIAL PRIMARY KEY,
            nom VARCHAR(255) UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS role (
            nom VARCHAR(100) PRIMARY KEY,
            description TEXT
        );
        
        -- Ajouter la contrainte de clé étrangère pour organisation_id
        ALTER TABLE utilisateur
        ADD CONSTRAINT fk_utilisateur_organisation 
        FOREIGN KEY (organisation_id) REFERENCES organisation(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_utilisateur_email ON utilisateur(email);
        CREATE INDEX IF NOT EXISTS idx_utilisateur_organisation ON utilisateur(organisation_id);
    """)

    # ============================================================================
    # DOSSIERS ET DOCUMENTS
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS dossier (
            id BIGSERIAL PRIMARY KEY,
            nom VARCHAR(255) NOT NULL,
            description TEXT,
            proprietaire_id BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            parent_id BIGINT REFERENCES dossier(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_dossier_parent ON dossier(parent_id);
        CREATE INDEX IF NOT EXISTS idx_dossier_proprietaire ON dossier(proprietaire_id);
        
        CREATE TABLE IF NOT EXISTS document (
            id BIGSERIAL PRIMARY KEY,
            titre VARCHAR(255) NOT NULL,
            description TEXT,
            fichier VARCHAR(1024),
            chemin_fichier VARCHAR(1024),
            taille BIGINT,
            mime_type VARCHAR(255),
            categorie VARCHAR(100),
            -- Colonnes pour MinIO (S3-compatible storage)
            minio_bucket VARCHAR(100),
            minio_object_name VARCHAR(500),
            minio_url TEXT,
            -- Colonnes legacy Cloudinary (pour compatibilité)
            cloudinary_url TEXT,
            cloudinary_public_id VARCHAR(255),
            proprietaire_id BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            dossier_id BIGINT REFERENCES dossier(id) ON DELETE SET NULL,
            cree_par BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            modifie_par BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            date_ajout TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            derniere_modification TIMESTAMP WITH TIME ZONE,
            is_deleted BOOLEAN DEFAULT FALSE
        );
        
        CREATE INDEX IF NOT EXISTS idx_document_dossier ON document(dossier_id);
        CREATE INDEX IF NOT EXISTS idx_document_proprietaire ON document(proprietaire_id);
        CREATE INDEX IF NOT EXISTS idx_document_deleted ON document(is_deleted);
        CREATE INDEX IF NOT EXISTS idx_document_categorie ON document(categorie);
        CREATE INDEX IF NOT EXISTS idx_document_minio_object ON document(minio_object_name);
    """)

    # ============================================================================
    # GESTION DES VERSIONS
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS document_version (
            id BIGSERIAL PRIMARY KEY,
            document_id BIGINT NOT NULL REFERENCES document(id) ON DELETE CASCADE,
            version_number INTEGER NOT NULL,
            fichier VARCHAR(1024),
            taille BIGINT,
            mime_type VARCHAR(255),
            commentaire TEXT,
            -- Colonnes pour MinIO
            minio_bucket VARCHAR(100),
            minio_object_name VARCHAR(500),
            minio_url TEXT,
            created_by BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(document_id, version_number)
        );
        
        CREATE INDEX IF NOT EXISTS idx_document_version_doc ON document_version(document_id);
    """)

    # ============================================================================
    # COMMENTAIRES
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS document_comment (
            id BIGSERIAL PRIMARY KEY,
            document_id BIGINT NOT NULL REFERENCES document(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_by BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            parent_id BIGINT REFERENCES document_comment(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_document_comment_doc ON document_comment(document_id);
        CREATE INDEX IF NOT EXISTS idx_document_comment_parent ON document_comment(parent_id);
        CREATE INDEX IF NOT EXISTS idx_document_comment_user ON document_comment(created_by);
    """)

    # ============================================================================
    # ABONNEMENTS AUX DOCUMENTS
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS document_subscription (
            id BIGSERIAL PRIMARY KEY,
            document_id BIGINT NOT NULL REFERENCES document(id) ON DELETE CASCADE,
            user_id BIGINT NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
            notify_new_version BOOLEAN DEFAULT TRUE,
            notify_metadata_change BOOLEAN DEFAULT TRUE,
            notify_comments BOOLEAN DEFAULT TRUE,
            notify_workflow BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE,
            UNIQUE(document_id, user_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_document_subscription_doc ON document_subscription(document_id);
        CREATE INDEX IF NOT EXISTS idx_document_subscription_user ON document_subscription(user_id);
    """)

    # ============================================================================
    # CHECKOUT (VERROUILLAGE)
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS document_checkout (
            id BIGSERIAL PRIMARY KEY,
            document_id BIGINT NOT NULL REFERENCES document(id) ON DELETE CASCADE,
            locked_by BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE,
            is_locked BOOLEAN DEFAULT TRUE
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS uq_checkout_document 
        ON document_checkout(document_id) WHERE is_locked = TRUE;
    """)

    # ============================================================================
    # TAGS
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS document_tag (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS document_tag_link (
            document_id BIGINT NOT NULL REFERENCES document(id) ON DELETE CASCADE,
            tag_id BIGINT NOT NULL REFERENCES document_tag(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (document_id, tag_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_tag_link_doc ON document_tag_link(document_id);
        CREATE INDEX IF NOT EXISTS idx_tag_link_tag ON document_tag_link(tag_id);
    """)

    # ============================================================================
    # PARTAGE DE DOCUMENTS
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS partage_document (
            id BIGSERIAL PRIMARY KEY,
            document_id BIGINT NOT NULL REFERENCES document(id) ON DELETE CASCADE,
            utilisateur_id BIGINT REFERENCES utilisateur(id) ON DELETE CASCADE,
            role_nom VARCHAR(100) REFERENCES role(nom) ON DELETE CASCADE,
            organisation_id BIGINT REFERENCES organisation(id) ON DELETE CASCADE,
            permissions TEXT[] NOT NULL DEFAULT ARRAY['lecture']::TEXT[],
            createur_id BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            date_partage TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            date_expiration TIMESTAMP WITH TIME ZONE,
            commentaire TEXT,
            actif BOOLEAN DEFAULT TRUE,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_partage_doc ON partage_document(document_id);
        CREATE INDEX IF NOT EXISTS idx_partage_utilisateur ON partage_document(utilisateur_id);
        CREATE INDEX IF NOT EXISTS idx_partage_role ON partage_document(role_nom);
        CREATE INDEX IF NOT EXISTS idx_partage_org ON partage_document(organisation_id);
        
        -- Vue pour faciliter les requêtes
        CREATE OR REPLACE VIEW partage_document_details AS
        SELECT 
            p.id,
            p.document_id,
            p.utilisateur_id,
            p.role_nom,
            p.organisation_id,
            p.permissions,
            p.createur_id,
            p.date_partage,
            p.date_expiration,
            p.commentaire,
            p.actif,
            u.nom AS utilisateur_nom,
            u.prenom AS utilisateur_prenom,
            r.description AS role_description,
            o.nom AS organisation_nom
        FROM partage_document p
        LEFT JOIN utilisateur u ON p.utilisateur_id = u.id
        LEFT JOIN role r ON p.role_nom = r.nom
        LEFT JOIN organisation o ON p.organisation_id = o.id;
    """)

    # ============================================================================
    # CORBEILLE
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS trash (
            id BIGSERIAL PRIMARY KEY,
            item_id BIGINT NOT NULL,
            item_type VARCHAR(50) NOT NULL,
            item_data JSONB,
            deleted_by BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            restored_at TIMESTAMP WITH TIME ZONE,
            restored_by BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            permanent_delete_at TIMESTAMP WITH TIME ZONE,
            permanent_delete_by BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            expiry_date TIMESTAMP WITH TIME ZONE,
            size_bytes BIGINT,
            original_path TEXT,
            deletion_reason TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_trash_item ON trash(item_type, item_id);
        CREATE INDEX IF NOT EXISTS idx_trash_expiry ON trash(expiry_date);
        CREATE INDEX IF NOT EXISTS idx_trash_deleted_by ON trash(deleted_by);
        
        CREATE TABLE IF NOT EXISTS trash_config (
            id BIGSERIAL PRIMARY KEY,
            setting_name VARCHAR(100) UNIQUE NOT NULL,
            setting_value VARCHAR(255) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # ============================================================================
    # WORKFLOW - Tables principales
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS workflow (
            id BIGSERIAL PRIMARY KEY,
            nom VARCHAR(255) NOT NULL,
            description TEXT,
            created_by BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE TABLE IF NOT EXISTS etape_workflow (
            id BIGSERIAL PRIMARY KEY,
            workflow_id BIGINT NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
            nom VARCHAR(255) NOT NULL,
            description TEXT,
            ordre INTEGER NOT NULL,
            type_approbation VARCHAR(50),
            delai_max INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_etape_workflow_workflow ON etape_workflow(workflow_id);
        CREATE INDEX IF NOT EXISTS idx_etape_workflow_ordre ON etape_workflow(workflow_id, ordre);
        
        CREATE TABLE IF NOT EXISTS workflow_instance (
            id BIGSERIAL PRIMARY KEY,
            workflow_id BIGINT NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
            document_id BIGINT NOT NULL REFERENCES document(id) ON DELETE CASCADE,
            statut VARCHAR(50) NOT NULL DEFAULT 'EN_COURS',
            etape_courante_id BIGINT REFERENCES etape_workflow(id) ON DELETE SET NULL,
            initiateur_id BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            date_debut TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            date_fin TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_workflow_instance_workflow ON workflow_instance(workflow_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_instance_document ON workflow_instance(document_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_instance_statut ON workflow_instance(statut);
        CREATE INDEX IF NOT EXISTS idx_workflow_instance_etape ON workflow_instance(etape_courante_id);
        
        CREATE TABLE IF NOT EXISTS workflow_approbateur (
            id BIGSERIAL PRIMARY KEY,
            etape_id BIGINT NOT NULL REFERENCES etape_workflow(id) ON DELETE CASCADE,
            utilisateur_id BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            role_nom VARCHAR(100) REFERENCES role(nom) ON DELETE SET NULL,
            organisation_id BIGINT REFERENCES organisation(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_wfa_etape ON workflow_approbateur(etape_id);
        CREATE INDEX IF NOT EXISTS idx_wfa_user ON workflow_approbateur(utilisateur_id);
        CREATE INDEX IF NOT EXISTS idx_wfa_role ON workflow_approbateur(role_nom);
        CREATE INDEX IF NOT EXISTS idx_wfa_org ON workflow_approbateur(organisation_id);
        
        CREATE TABLE IF NOT EXISTS workflow_approbation (
            id BIGSERIAL PRIMARY KEY,
            instance_id BIGINT NOT NULL REFERENCES workflow_instance(id) ON DELETE CASCADE,
            etape_id BIGINT REFERENCES etape_workflow(id) ON DELETE SET NULL,
            approbateur_id BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            decision VARCHAR(50),
            commentaire TEXT,
            date_decision TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_workflow_appro_instance ON workflow_approbation(instance_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_appro_etape ON workflow_approbation(etape_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_appro_user ON workflow_approbation(approbateur_id);
    """)

    # ============================================================================
    # HISTORIQUE ET LOGS
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id BIGSERIAL PRIMARY KEY,
            entity_type VARCHAR(50) NOT NULL,
            entity_id BIGINT NOT NULL,
            entity_name VARCHAR(255),
            description TEXT,
            action_type VARCHAR(100) NOT NULL,
            user_id BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_history_entity ON history(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id);
        CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at);
        
        CREATE TABLE IF NOT EXISTS system_logs (
            id BIGSERIAL PRIMARY KEY,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            level VARCHAR(20) NOT NULL,
            event_type VARCHAR(100),
            user_id BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            request_path VARCHAR(500),
            request_method VARCHAR(10),
            response_status INTEGER,
            execution_time FLOAT,
            message TEXT,
            additional_data JSONB
        );
        
        CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
        CREATE INDEX IF NOT EXISTS idx_system_logs_user ON system_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_system_logs_event ON system_logs(event_type);
    """)

    # ============================================================================
    # NOTIFICATIONS
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            document_id BIGINT REFERENCES document(id) ON DELETE CASCADE,
            workflow_instance_id BIGINT REFERENCES workflow_instance(id) ON DELETE CASCADE,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP WITH TIME ZONE,
            metadata JSONB
        );
        
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
        
        CREATE TABLE IF NOT EXISTS user_notification_preferences (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
            email_notifications BOOLEAN DEFAULT TRUE,
            push_notifications BOOLEAN DEFAULT TRUE,
            notification_types JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE,
            UNIQUE(user_id)
        );
    """)

    # ============================================================================
    # EMAIL - Configuration et Templates
    # ============================================================================
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS email_config (
            id SERIAL PRIMARY KEY,
            mail_server VARCHAR(255) NOT NULL,
            mail_port INTEGER NOT NULL DEFAULT 587,
            mail_use_tls BOOLEAN DEFAULT TRUE,
            mail_use_ssl BOOLEAN DEFAULT FALSE,
            mail_username VARCHAR(255) NOT NULL,
            mail_password VARCHAR(255) NOT NULL,
            mail_default_sender VARCHAR(255) NOT NULL,
            mail_max_emails INTEGER DEFAULT 50,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS email_templates (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            subject VARCHAR(255) NOT NULL,
            html_content TEXT NOT NULL,
            text_content TEXT,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS email_logs (
            id SERIAL PRIMARY KEY,
            recipients TEXT NOT NULL,
            subject VARCHAR(255) NOT NULL,
            sender VARCHAR(255),
            sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'sent',
            error_message TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_email_logs_sent ON email_logs(sent_at);
        CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
    """)

    # ============================================================================
    # FONCTIONNALITÉS SUPPLÉMENTAIRES
    # ============================================================================
    
    op.execute("""
        -- Recherches sauvegardées
        CREATE TABLE IF NOT EXISTS saved_searches (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            query_params JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
        
        -- Favoris
        CREATE TABLE IF NOT EXISTS favoris (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
            document_id BIGINT REFERENCES document(id) ON DELETE CASCADE,
            dossier_id BIGINT REFERENCES dossier(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            date_ajout TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, document_id),
            UNIQUE(user_id, dossier_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_favoris_user ON favoris(user_id);
        
        -- Numérisation (scan)
        CREATE TABLE IF NOT EXISTS numerisation (
            id BIGSERIAL PRIMARY KEY,
            document_id BIGINT REFERENCES document(id) ON DELETE CASCADE,
            scan_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            scan_quality VARCHAR(50),
            ocr_performed BOOLEAN DEFAULT FALSE,
            ocr_text TEXT,
            scanned_by BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
            metadata JSONB
        );
        
        CREATE INDEX IF NOT EXISTS idx_numerisation_document ON numerisation(document_id);
    """)

    # ============================================================================
    # FONCTIONS SQL UTILITAIRES
    # ============================================================================
    
    op.execute("""
        -- Fonction pour obtenir les statistiques de la corbeille
        CREATE OR REPLACE FUNCTION get_trash_stats() 
        RETURNS JSON AS $$
        DECLARE
            result JSON;
        BEGIN
            SELECT json_build_object(
                'total_items', COUNT(*),
                'total_size', COALESCE(SUM(size_bytes), 0),
                'documents_count', COUNT(*) FILTER (WHERE item_type = 'document'),
                'folders_count', COUNT(*) FILTER (WHERE item_type = 'folder'),
                'oldest_date', MIN(deleted_at)
            )
            INTO result
            FROM trash
            WHERE permanent_delete_at IS NULL;
            
            RETURN result;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Fonction pour obtenir la taille totale de la corbeille
        CREATE OR REPLACE FUNCTION get_trash_size() 
        RETURNS BIGINT AS $$
            SELECT COALESCE(SUM(size_bytes), 0) 
            FROM trash 
            WHERE permanent_delete_at IS NULL;
        $$ LANGUAGE SQL;
    """)

    # ============================================================================
    # DONNÉES INITIALES
    # ============================================================================
    
    op.execute("""
        -- Rôles par défaut
        INSERT INTO role (nom, description) VALUES
            ('admin', 'Administrateur'),
            ('editor', 'Editeur'),
            ('viewer', 'Lecteur')
        ON CONFLICT (nom) DO NOTHING;
        
        -- Organisation par défaut
        INSERT INTO organisation (nom, description) VALUES
            ('ESAG', 'Organisation par défaut')
        ON CONFLICT (nom) DO NOTHING;
        
        -- Utilisateur admin par défaut
        -- Mot de passe: Admin@12345
        INSERT INTO utilisateur (email, nom, prenom, mot_de_passe, role, actif)
        VALUES (
            'admin@esag.com',
            'Admin',
            'ESAG',
            'scrypt:32768:8:1$A5UtlwRk0V2mJiNx$e64312947f02ff756c751a5f91d260adf84579957bb3ef81a125567b6e0800fd09834e2241af56df14b5a0bd6beb84e6d187d396480f61b1e6b3e683402c3561',
            'admin',
            TRUE
        )
        ON CONFLICT (email) DO UPDATE SET
            mot_de_passe = 'scrypt:32768:8:1$A5UtlwRk0V2mJiNx$e64312947f02ff756c751a5f91d260adf84579957bb3ef81a125567b6e0800fd09834e2241af56df14b5a0bd6beb84e6d187d396480f61b1e6b3e683402c3561';
        
        -- Lier l'admin à l'organisation ESAG
        UPDATE utilisateur 
        SET organisation_id = (SELECT id FROM organisation WHERE nom = 'ESAG' LIMIT 1)
        WHERE email = 'admin@esag.com' AND organisation_id IS NULL;
        
        -- Configuration de la corbeille par défaut
        INSERT INTO trash_config (setting_name, setting_value) VALUES
            ('retention_days', '30'),
            ('auto_cleanup_enabled', 'true')
        ON CONFLICT (setting_name) DO NOTHING;
    """)


def downgrade() -> None:
    # Drop all tables in reverse order of dependencies
    op.execute("""
        DROP FUNCTION IF EXISTS get_trash_stats();
        DROP TABLE IF EXISTS numerisation CASCADE;
        DROP TABLE IF EXISTS favoris CASCADE;
        DROP TABLE IF EXISTS saved_searches CASCADE;
        DROP TABLE IF EXISTS email_logs CASCADE;
        DROP TABLE IF EXISTS email_templates CASCADE;
        DROP TABLE IF EXISTS email_config CASCADE;
        DROP TABLE IF EXISTS user_notification_preferences CASCADE;
        DROP TABLE IF EXISTS notifications CASCADE;
        DROP TABLE IF EXISTS system_logs CASCADE;
        DROP TABLE IF EXISTS history CASCADE;
        DROP TABLE IF EXISTS workflow_approbation CASCADE;
        DROP TABLE IF EXISTS workflow_approbateur CASCADE;
        DROP TABLE IF EXISTS workflow_instance CASCADE;
        DROP TABLE IF EXISTS etape_workflow CASCADE;
        DROP TABLE IF EXISTS workflow CASCADE;
        DROP TABLE IF EXISTS trash_config CASCADE;
        DROP TABLE IF EXISTS trash CASCADE;
        DROP VIEW IF EXISTS partage_document_details CASCADE;
        DROP TABLE IF EXISTS partage_document CASCADE;
        DROP TABLE IF EXISTS document_tag_link CASCADE;
        DROP TABLE IF EXISTS document_tag CASCADE;
        DROP TABLE IF EXISTS document_checkout CASCADE;
        DROP TABLE IF EXISTS document_subscription CASCADE;
        DROP TABLE IF EXISTS document_comment CASCADE;
        DROP TABLE IF EXISTS document_version CASCADE;
        DROP TABLE IF EXISTS document CASCADE;
        DROP TABLE IF EXISTS dossier CASCADE;
        DROP TABLE IF EXISTS role CASCADE;
        DROP TABLE IF EXISTS organisation CASCADE;
        DROP TABLE IF EXISTS utilisateur CASCADE;
    """)
