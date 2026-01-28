# Guide des Migrations de Base de Données - ESAG GED

## Vue d'ensemble

Le projet ESAG GED utilise **Alembic** pour gérer les migrations de base de données. Avec Docker, les migrations sont appliquées automatiquement au démarrage.

## Architecture des migrations

```
┌─────────────────────────────────────────┐
│     docker-compose up                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  1. PostgreSQL démarre                  │
│     (healthcheck: service_healthy)      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Service migrations démarre          │
│     - Attend PostgreSQL                 │
│     - Exécute: alembic upgrade head     │
│     - Applique toutes les migrations    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. Base de données prête               │
│     - Toutes les tables créées          │
│     - Données initiales insérées        │
└─────────────────────────────────────────┘
```

## Migrations automatiques avec Docker

### Démarrage initial

Lors du premier démarrage avec Docker :

```bash
docker-compose up -d
```

Le service `migrations` va automatiquement :
1. ✅ Attendre que PostgreSQL soit prêt
2. ✅ Vérifier l'état actuel de la base de données
3. ✅ Appliquer toutes les migrations en attente
4. ✅ Créer toutes les tables nécessaires
5. ✅ Insérer les données initiales (seed)

### Vérifier les logs des migrations

```bash
# Voir les logs du service de migration
docker-compose logs migrations

# Exemple de sortie attendue :
# 🔄 Initialisation de la base de données ESAG GED...
# ⏳ Attente de PostgreSQL...
# ✅ PostgreSQL est prêt!
# 🚀 Application des migrations Alembic...
# INFO  [alembic.runtime.migration] Running upgrade  -> 20251121_0001
# INFO  [alembic.runtime.migration] Running upgrade 20251121_0001 -> 20251121_0002
# ✅ Migrations appliquées avec succès!
```

## Migrations existantes

Le projet contient actuellement 4 migrations :

| Migration | Description | Fichier |
|-----------|-------------|---------|
| **0001** | Création initiale de toutes les tables | `20251121_0001_init_full.py` |
| **0002** | Données initiales (seed) | `20251121_0002_seed_initial.py` |
| **0003** | Ajout des logs système | `20251122_0003_add_system_logs.py` |
| **0004** | Workflow approbateur | `20251122_0004_workflow_approbateur.py` |

## Gestion manuelle des migrations

### Vérifier l'état actuel

```bash
# Depuis l'hôte (si alembic installé)
alembic current

# Ou via Docker
docker-compose run --rm migrations alembic current
```

### Appliquer les migrations manuellement

```bash
# Appliquer toutes les migrations
alembic upgrade head

# Ou via Docker
docker-compose run --rm migrations alembic upgrade head

# Appliquer une migration spécifique
alembic upgrade +1

# Revenir en arrière d'une migration
alembic downgrade -1
```

### Créer une nouvelle migration

```bash
# 1. Modifier vos modèles dans AppFlask/models/

# 2. Générer automatiquement la migration
alembic revision --autogenerate -m "Description de la migration"

# 3. Vérifier le fichier généré dans migrations/versions/

# 4. Appliquer la migration
alembic upgrade head
```

### Historique des migrations

```bash
# Voir l'historique complet
alembic history

# Voir l'historique avec détails
alembic history --verbose
```

## Configuration Alembic

### Fichier alembic.ini

Le fichier `alembic.ini` contient la configuration de base :

```ini
[alembic]
script_location = migrations
sqlalchemy.url = driver://user:pass@localhost/dbname
```

**Note** : L'URL de connexion est surchargée par la variable d'environnement `DATABASE_URL`.

### Fichier migrations/env.py

Ce fichier configure l'environnement Alembic et charge les modèles SQLAlchemy.

## Résolution de problèmes

### Les migrations ne s'appliquent pas

```bash
# Vérifier les logs
docker-compose logs migrations

# Vérifier que PostgreSQL est accessible
docker-compose exec postgres psql -U esag_user -d esag_ged -c "SELECT 1"

# Relancer les migrations manuellement
docker-compose run --rm migrations ./init-db.sh
```

### Erreur "relation already exists"

Cela signifie que la table existe déjà. Options :

**Option 1 : Marquer la migration comme appliquée**
```bash
# Marquer toutes les migrations comme appliquées sans les exécuter
alembic stamp head
```

**Option 2 : Réinitialiser complètement**
```bash
# ⚠️ ATTENTION : Supprime toutes les données
docker-compose down -v
docker-compose up -d
```

### Conflit de migration

Si deux migrations ont le même numéro de révision :

```bash
# Voir les conflits
alembic branches

# Fusionner les branches
alembic merge heads -m "Fusion des branches"
```

### Base de données corrompue

```bash
# Sauvegarder les données
docker exec esag_ged_postgres pg_dump -U esag_user esag_ged > backup.sql

# Supprimer et recréer
docker-compose down -v
docker-compose up -d

# Restaurer les données
docker exec -i esag_ged_postgres psql -U esag_user esag_ged < backup.sql
```

## Workflow de développement

### Ajouter une nouvelle fonctionnalité

1. **Modifier le modèle**
   ```python
   # AppFlask/models/mon_modele.py
   def create_table():
       return """
       CREATE TABLE IF NOT EXISTS ma_nouvelle_table (
           id SERIAL PRIMARY KEY,
           nom VARCHAR(255) NOT NULL
       )
       """
   ```

2. **Créer la migration**
   ```bash
   alembic revision -m "Ajout table ma_nouvelle_table"
   ```

3. **Éditer le fichier de migration**
   ```python
   # migrations/versions/xxx_ajout_table.py
   def upgrade():
       op.execute("""
           CREATE TABLE ma_nouvelle_table (
               id SERIAL PRIMARY KEY,
               nom VARCHAR(255) NOT NULL
           )
       """)
   
   def downgrade():
       op.execute("DROP TABLE IF EXISTS ma_nouvelle_table")
   ```

4. **Tester la migration**
   ```bash
   # Appliquer
   alembic upgrade head
   
   # Vérifier
   psql -h localhost -p 5434 -U esag_user -d esag_ged -c "\dt"
   
   # Revenir en arrière (test)
   alembic downgrade -1
   
   # Réappliquer
   alembic upgrade head
   ```

5. **Commiter**
   ```bash
   git add migrations/versions/xxx_ajout_table.py
   git commit -m "Migration: Ajout table ma_nouvelle_table"
   ```

## Bonnes pratiques

### ✅ À faire

- **Toujours tester** les migrations en local avant de les pousser
- **Écrire des migrations réversibles** (upgrade + downgrade)
- **Commenter** les migrations complexes
- **Sauvegarder** avant d'appliquer des migrations en production
- **Versionner** tous les fichiers de migration

### ❌ À éviter

- **Ne jamais modifier** une migration déjà appliquée en production
- **Ne pas supprimer** de fichiers de migration
- **Éviter** les migrations qui prennent trop de temps
- **Ne pas oublier** les index sur les colonnes fréquemment utilisées

## Scripts utiles

### Script de backup avant migration

```bash
#!/bin/bash
# backup-before-migrate.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

echo "📦 Sauvegarde de la base de données..."
docker exec esag_ged_postgres pg_dump -U esag_user esag_ged > "$BACKUP_FILE"

echo "✅ Sauvegarde créée: $BACKUP_FILE"
echo "🚀 Application des migrations..."

alembic upgrade head

echo "✅ Migrations terminées!"
```

### Script de vérification

```bash
#!/bin/bash
# check-migrations.sh

echo "📊 État des migrations:"
alembic current

echo ""
echo "📋 Migrations en attente:"
alembic show head

echo ""
echo "🔍 Tables dans la base de données:"
docker exec esag_ged_postgres psql -U esag_user -d esag_ged -c "\dt"
```

## Production

### Checklist avant migration en production

- [ ] Backup de la base de données
- [ ] Test des migrations en staging
- [ ] Vérification des dépendances
- [ ] Plan de rollback préparé
- [ ] Fenêtre de maintenance planifiée
- [ ] Équipe disponible pour support

### Appliquer en production

```bash
# 1. Backup
docker exec esag_ged_postgres pg_dump -U esag_user esag_ged > prod_backup.sql

# 2. Vérifier l'état
alembic current

# 3. Voir les migrations à appliquer
alembic history

# 4. Appliquer
alembic upgrade head

# 5. Vérifier
alembic current
psql -h localhost -p 5434 -U esag_user -d esag_ged -c "SELECT COUNT(*) FROM alembic_version"
```

## Ressources

- [Documentation Alembic](https://alembic.sqlalchemy.org/)
- [Guide des migrations PostgreSQL](https://www.postgresql.org/docs/current/ddl.html)
- Documentation du projet : `docs/DOCKER_SETUP.md`
