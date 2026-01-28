# Configuration Docker - ESAG GED

## Vue d'ensemble

Ce guide explique comment utiliser Docker pour exécuter PostgreSQL et MinIO localement pour le développement d'ESAG GED.

## Architecture

L'infrastructure Docker comprend :

- **PostgreSQL 15** : Base de données relationnelle
- **MinIO** : Stockage d'objets compatible S3
- **PgAdmin** : Interface web pour PostgreSQL (optionnel)

## Prérequis

- Docker Desktop installé
- Docker Compose installé
- 2 GB de RAM disponible minimum

## Installation rapide

### 1. Démarrer l'infrastructure

```bash
# Rendre le script exécutable
chmod +x docker-start.sh

# Démarrer tous les services
./docker-start.sh
```

### 2. Vérifier que tout fonctionne

```bash
# Vérifier l'état des conteneurs
docker-compose ps

# Voir les logs
docker-compose logs -f
```

### 3. Accéder aux services

| Service | URL | Identifiants |
|---------|-----|--------------|
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin123 |
| PgAdmin | http://localhost:5050 | admin@esag.com / admin123 |
| PostgreSQL | localhost:5432 | esag_user / esag_password_2024 |
| MinIO API | http://localhost:9000 | - |

## Configuration de l'application

### Variables d'environnement

Le fichier `.env.docker` contient la configuration pour Docker. Copiez-le vers `.env` :

```bash
cp .env.docker .env
```

### Variables importantes

```env
# Backend de stockage (minio ou cloudinary)
STORAGE_BACKEND=minio

# PostgreSQL
DATABASE_URL=postgresql://esag_user:esag_password_2024@localhost:5432/esag_ged

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_DOCUMENTS=esag-documents
MINIO_BUCKET_THUMBNAILS=esag-thumbnails
MINIO_USE_SSL=false
```

## Utilisation de MinIO

### Buckets créés automatiquement

Deux buckets sont créés au démarrage :

1. **esag-documents** : Stockage des documents
2. **esag-thumbnails** : Stockage des miniatures

### Accéder à la console MinIO

1. Ouvrir http://localhost:9001
2. Se connecter avec `minioadmin` / `minioadmin123`
3. Naviguer dans les buckets pour voir les fichiers uploadés

### API MinIO

L'API MinIO est accessible sur `http://localhost:9000` et est compatible avec l'API S3 d'Amazon.

## Utilisation de PostgreSQL

### Connexion directe

```bash
# Avec psql
psql -h localhost -p 5432 -U esag_user -d esag_ged

# Mot de passe : esag_password_2024
```

### Via PgAdmin

1. Ouvrir http://localhost:5050
2. Se connecter avec `admin@esag.com` / `admin123`
3. Ajouter un serveur :
   - Host : `postgres` (ou `localhost` si depuis l'hôte)
   - Port : `5432`
   - Database : `esag_ged`
   - Username : `esag_user`
   - Password : `esag_password_2024`

## Migrations de base de données

### Initialiser la base de données

```bash
# Activer l'environnement virtuel
source .venv/bin/activate

# Exécuter les migrations Alembic
alembic upgrade head
```

### Créer une nouvelle migration

```bash
alembic revision --autogenerate -m "Description de la migration"
alembic upgrade head
```

## Commandes utiles

### Gestion des conteneurs

```bash
# Démarrer les services
docker-compose up -d

# Arrêter les services
docker-compose down

# Arrêter et supprimer les volumes (⚠️ perte de données)
docker-compose down -v

# Redémarrer un service spécifique
docker-compose restart postgres
docker-compose restart minio

# Voir les logs
docker-compose logs -f
docker-compose logs -f postgres
docker-compose logs -f minio
```

### Gestion des données

```bash
# Backup PostgreSQL
docker exec esag_ged_postgres pg_dump -U esag_user esag_ged > backup.sql

# Restaurer PostgreSQL
docker exec -i esag_ged_postgres psql -U esag_user esag_ged < backup.sql

# Accéder au conteneur PostgreSQL
docker exec -it esag_ged_postgres bash

# Accéder au conteneur MinIO
docker exec -it esag_ged_minio sh
```

## Volumes Docker

Les données sont persistées dans des volumes Docker :

- `postgres_data` : Données PostgreSQL
- `minio_data` : Fichiers MinIO
- `pgadmin_data` : Configuration PgAdmin

### Nettoyer les volumes

```bash
# Lister les volumes
docker volume ls

# Supprimer les volumes ESAG GED (⚠️ perte de données)
docker-compose down -v
```

## Résolution de problèmes

### PostgreSQL ne démarre pas

```bash
# Vérifier les logs
docker-compose logs postgres

# Vérifier que le port 5432 n'est pas déjà utilisé
sudo lsof -i :5432

# Redémarrer le conteneur
docker-compose restart postgres
```

### MinIO ne démarre pas

```bash
# Vérifier les logs
docker-compose logs minio

# Vérifier que les ports 9000 et 9001 ne sont pas utilisés
sudo lsof -i :9000
sudo lsof -i :9001

# Redémarrer le conteneur
docker-compose restart minio
```

### Erreur de connexion depuis l'application

1. Vérifier que les services sont démarrés : `docker-compose ps`
2. Vérifier le fichier `.env` (DATABASE_URL, MINIO_ENDPOINT)
3. Vérifier que l'application peut accéder à `localhost`

### Réinitialiser complètement

```bash
# Arrêter et supprimer tout
docker-compose down -v

# Supprimer les images
docker-compose down --rmi all

# Redémarrer
./docker-start.sh
```

## Migration depuis Cloudinary

Si vous migrez depuis Cloudinary vers MinIO :

1. Changer `STORAGE_BACKEND=cloudinary` vers `STORAGE_BACKEND=minio` dans `.env`
2. Les nouveaux fichiers seront stockés dans MinIO
3. Les anciens fichiers restent accessibles sur Cloudinary
4. Optionnel : Script de migration des fichiers existants (à créer)

## Production

⚠️ **Cette configuration Docker est pour le développement local uniquement.**

Pour la production :

- Utiliser des mots de passe forts
- Activer SSL/TLS pour MinIO
- Configurer des backups automatiques
- Utiliser des services managés (AWS RDS, S3, etc.)
- Configurer la réplication et la haute disponibilité

## Ressources

- [Documentation MinIO](https://min.io/docs/minio/linux/index.html)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
- [Docker Compose](https://docs.docker.com/compose/)
