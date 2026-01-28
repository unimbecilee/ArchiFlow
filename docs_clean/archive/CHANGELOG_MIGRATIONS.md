# Changelog - Système de Migrations Automatiques

## 🎉 Migrations automatiques implémentées

**Date** : 28 janvier 2026

### Résumé

Le système de migrations de base de données est maintenant **entièrement automatisé** avec Docker. Au démarrage de l'infrastructure, toutes les migrations Alembic sont appliquées automatiquement sans intervention manuelle.

---

## 📦 Nouveaux fichiers créés

### Scripts et configuration
- ✅ `init-db.sh` - Script d'initialisation et d'application des migrations
- ✅ `Dockerfile.migrations` - Image Docker pour exécuter les migrations
- ✅ `MIGRATIONS_QUICKSTART.md` - Guide rapide des migrations

### Documentation
- ✅ `docs/MIGRATIONS.md` - Guide complet des migrations (300+ lignes)
- ✅ `CHANGELOG_MIGRATIONS.md` - Ce fichier

---

## 🔧 Fichiers modifiés

- ✅ `docker-compose.yml` - Ajout du service `migrations`
- ✅ `README.md` - Section migrations automatiques
- ✅ `DOCKER_QUICKSTART.md` - Information sur les migrations

---

## 🏗️ Architecture du système

```
┌─────────────────────────────────────────┐
│     docker-compose up -d                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Service: postgres                      │
│  - Démarre PostgreSQL 15                │
│  - Healthcheck actif                    │
└──────────────┬──────────────────────────┘
               │
               ▼ (depends_on: service_healthy)
┌─────────────────────────────────────────┐
│  Service: migrations                    │
│  1. Attend PostgreSQL (max 60s)         │
│  2. Vérifie l'état: alembic current     │
│  3. Applique: alembic upgrade head      │
│  4. Affiche l'état final                │
│  5. Se termine (restart: no)            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Base de données prête                  │
│  - Toutes les tables créées             │
│  - Données initiales insérées           │
│  - Application peut démarrer            │
└─────────────────────────────────────────┘
```

---

## 🚀 Fonctionnement

### Au démarrage de Docker

```bash
docker-compose up -d
```

**Séquence automatique :**

1. **PostgreSQL démarre** (conteneur `esag_ged_postgres`)
   - Base de données `esag_ged` créée
   - Utilisateur `esag_user` configuré
   - Healthcheck vérifie la disponibilité

2. **Service migrations attend** (conteneur `esag_ged_migrations`)
   - Attend que PostgreSQL soit healthy
   - Timeout de 60 secondes maximum

3. **Migrations appliquées**
   ```bash
   alembic upgrade head
   ```
   - Migration 0001 : Création de toutes les tables
   - Migration 0002 : Données initiales (seed)
   - Migration 0003 : Logs système
   - Migration 0004 : Workflow approbateur

4. **Service se termine**
   - Le conteneur migrations s'arrête (restart: no)
   - PostgreSQL continue de fonctionner
   - Base de données prête à l'emploi

---

## 📊 Migrations existantes

| # | Fichier | Description |
|---|---------|-------------|
| **0001** | `20251121_0001_init_full.py` | Tables principales (documents, utilisateurs, workflows, etc.) |
| **0002** | `20251121_0002_seed_initial.py` | Données initiales (rôles, utilisateur admin) |
| **0003** | `20251122_0003_add_system_logs.py` | Table des logs système |
| **0004** | `20251122_0004_workflow_approbateur.py` | Table workflow_approbateur |

---

## 🔍 Vérification

### Voir les logs de migration

```bash
# Logs du service migrations
docker-compose logs migrations

# Exemple de sortie :
# 🔄 Initialisation de la base de données ESAG GED...
# ⏳ Attente de PostgreSQL...
# ✅ PostgreSQL est prêt!
# 🚀 Application des migrations Alembic...
# INFO  [alembic.runtime.migration] Running upgrade  -> 20251121_0001
# INFO  [alembic.runtime.migration] Running upgrade 20251121_0001 -> 20251121_0002
# INFO  [alembic.runtime.migration] Running upgrade 20251121_0002 -> 20251122_0003
# INFO  [alembic.runtime.migration] Running upgrade 20251122_0003 -> 20251122_0004
# ✅ Migrations appliquées avec succès!
```

### Vérifier l'état de la base

```bash
# État actuel des migrations
docker-compose run --rm migrations alembic current

# Historique complet
docker-compose run --rm migrations alembic history

# Lister les tables créées
docker exec esag_ged_postgres psql -U esag_user -d esag_ged -c "\dt"
```

---

## 🛠️ Utilisation

### Démarrage normal

```bash
# Tout est automatique !
docker-compose up -d

# Vérifier que tout s'est bien passé
docker-compose logs migrations
```

### Créer une nouvelle migration

```bash
# 1. Modifier vos modèles dans AppFlask/models/

# 2. Créer la migration
alembic revision -m "Description de la migration"

# 3. Éditer le fichier généré dans migrations/versions/

# 4. Appliquer (deux options)

# Option A : Via Docker (recommandé)
docker-compose run --rm migrations alembic upgrade head

# Option B : Redémarrer le service migrations
docker-compose restart migrations
```

### Appliquer manuellement

```bash
# Exécuter le script d'initialisation
docker-compose run --rm migrations ./init-db.sh

# Ou directement Alembic
docker-compose run --rm migrations alembic upgrade head
```

---

## ⚙️ Configuration

### Variables d'environnement (service migrations)

```yaml
environment:
  POSTGRES_HOST: postgres          # Nom du service PostgreSQL
  POSTGRES_PORT: 5432              # Port interne (pas 5434)
  POSTGRES_DB: esag_ged            # Nom de la base
  POSTGRES_USER: esag_user         # Utilisateur
  POSTGRES_PASSWORD: esag_password_2024
  DATABASE_URL: postgresql://esag_user:esag_password_2024@postgres:5432/esag_ged
```

### Dépendances

Le service migrations dépend de PostgreSQL avec healthcheck :

```yaml
depends_on:
  postgres:
    condition: service_healthy
```

Cela garantit que PostgreSQL est complètement prêt avant d'appliquer les migrations.

---

## 🔧 Résolution de problèmes

### Les migrations ne s'appliquent pas

```bash
# 1. Vérifier les logs
docker-compose logs migrations

# 2. Vérifier PostgreSQL
docker-compose ps postgres

# 3. Réexécuter manuellement
docker-compose run --rm migrations ./init-db.sh
```

### Erreur "relation already exists"

La table existe déjà. Options :

```bash
# Option 1 : Marquer comme appliquée
docker-compose run --rm migrations alembic stamp head

# Option 2 : Réinitialiser (⚠️ perte de données)
docker-compose down -v
docker-compose up -d
```

### Timeout PostgreSQL

Si PostgreSQL met trop de temps à démarrer :

```bash
# Augmenter le timeout dans init-db.sh
# Modifier : max_attempts=30 -> max_attempts=60
```

---

## ✨ Avantages

### Automatisation
- ✅ **Zéro configuration manuelle** - Tout est automatique
- ✅ **Idempotent** - Peut être exécuté plusieurs fois sans problème
- ✅ **Fiable** - Attend que PostgreSQL soit vraiment prêt

### Développement
- ✅ **Onboarding rapide** - Nouveau développeur = `docker-compose up -d`
- ✅ **Environnements cohérents** - Même schéma partout
- ✅ **Tests faciles** - Reset rapide avec `docker-compose down -v`

### Production
- ✅ **Traçabilité** - Logs complets des migrations
- ✅ **Rollback possible** - Migrations réversibles
- ✅ **Versioning** - Historique complet dans Git

---

## 📚 Documentation

### Guides disponibles

- **Guide rapide** : `MIGRATIONS_QUICKSTART.md`
- **Guide complet** : `docs/MIGRATIONS.md`
- **Docker** : `docs/DOCKER_SETUP.md`
- **Migration MinIO** : `docs/MIGRATION_MINIO.md`

### Commandes utiles

```bash
# Voir l'état
docker-compose logs migrations
docker-compose run --rm migrations alembic current

# Historique
docker-compose run --rm migrations alembic history

# Appliquer
docker-compose run --rm migrations alembic upgrade head

# Revenir en arrière
docker-compose run --rm migrations alembic downgrade -1

# Créer une migration
alembic revision -m "Description"
```

---

## 🎯 Prochaines étapes

### Immédiat
1. ✅ Tester le démarrage complet
2. ✅ Vérifier que toutes les tables sont créées
3. ✅ Vérifier les données initiales

### Court terme
1. ⏳ Ajouter des tests pour les migrations
2. ⏳ Documenter les patterns de migration
3. ⏳ Créer des migrations pour les nouvelles fonctionnalités

### Moyen terme
1. ⏳ Backup automatique avant migration
2. ⏳ Notifications sur échec de migration
3. ⏳ Dashboard de monitoring des migrations

---

## 🎉 Résultat

Le projet ESAG GED dispose maintenant de :

- ✅ **Migrations automatiques** au démarrage Docker
- ✅ **Script d'initialisation** robuste avec retry
- ✅ **Service dédié** dans docker-compose
- ✅ **Documentation complète** avec exemples
- ✅ **Workflow de développement** simplifié
- ✅ **Gestion des erreurs** et logs détaillés

**Les migrations sont maintenant complètement automatisées et transparentes pour les développeurs !** 🚀
