# Architecture de la base de données

## 📊 Vue d'ensemble

ESAG GED utilise PostgreSQL comme base de données principale avec Alembic pour les migrations.

## 🗂️ Schéma principal

### Tables principales

#### Utilisateurs et organisations
- `utilisateur` - Comptes utilisateurs
- `organisation` - Organisations/entreprises
- `role` - Rôles et permissions

#### Documents
- `document` - Documents principaux
- `document_version` - Historique des versions
- `document_metadata` - Métadonnées OCR et indexation
- `dossier` - Dossiers/répertoires

#### Workflows
- `workflow` - Modèles de workflows
- `etape_workflow` - Étapes de validation
- `workflow_instance` - Instances actives
- `workflow_approbateur` - Approbateurs par étape
- `workflow_approbation` - Historique des approbations

#### Partage et permissions
- `partage_document` - Partages de documents
- `partage_link` - Liens de partage publics
- `favoris` - Documents favoris

#### Système
- `history` - Historique des actions
- `notifications` - Notifications utilisateurs
- `system_logs` - Logs système
- `trash` - Corbeille

## 🔄 Migrations

### Migration unique complète

Le projet utilise une **migration unique** qui contient tout le schéma :

```
migrations/versions/20260128_0001_complete_schema.py
```

Cette migration inclut :
- ✅ Toutes les tables
- ✅ Tous les index
- ✅ Toutes les contraintes
- ✅ Toutes les fonctions SQL
- ✅ Données initiales (admin, rôles, organisation)

### Appliquer les migrations

```bash
# Avec Docker
docker-compose up -d

# Manuellement
alembic upgrade head
```

### Réinitialiser la base de données

```bash
# Supprimer les volumes Docker
docker-compose down -v

# Redémarrer
docker-compose up -d
```

## 🔐 Sécurité

- Mots de passe hashés avec `scrypt`
- Contraintes de clés étrangères avec `ON DELETE CASCADE`
- Index sur les colonnes fréquemment interrogées
- Transactions pour l'intégrité des données

## 📈 Optimisations

### Index principaux
- `idx_document_proprietaire` - Recherche par propriétaire
- `idx_document_dossier` - Navigation dans les dossiers
- `idx_notifications_user` - Notifications utilisateur
- `idx_history_user` - Historique utilisateur

### Fonctions SQL
- `get_trash_stats()` - Statistiques de la corbeille
- `get_trash_size()` - Taille totale de la corbeille

## 🔗 Relations clés

```
utilisateur
  ├── document (proprietaire_id)
  ├── workflow_instance (initiateur_id)
  ├── notifications (user_id)
  └── favoris (user_id)

document
  ├── document_version (document_id)
  ├── partage_document (document_id)
  ├── workflow_instance (document_id)
  └── favoris (document_id)

workflow
  ├── etape_workflow (workflow_id)
  └── workflow_instance (workflow_id)
```

## 📝 Colonnes importantes

### Support MinIO (S3)
- `minio_bucket` - Nom du bucket
- `minio_object_name` - Nom de l'objet
- `minio_url` - URL d'accès

### Colonnes de compatibilité
- `date_ajout` - Alias pour `date_creation`
- `chemin_fichier` - Alias pour `fichier`
- `cloudinary_*` - Support legacy Cloudinary

## 🛠️ Maintenance

### Nettoyage automatique
- Suppression définitive des éléments en corbeille après 30 jours
- Nettoyage des logs système anciens
- Purge des sessions expirées

### Backup recommandé
```bash
# Backup PostgreSQL
docker exec esag_ged_postgres pg_dump -U esag_user esag_ged > backup.sql

# Restore
docker exec -i esag_ged_postgres psql -U esag_user esag_ged < backup.sql
```
