# Guide de démarrage rapide ESAG GED

## 🚀 Démarrage en 5 minutes

### Prérequis
- Docker et Docker Compose installés
- Git

### Installation

```bash
# 1. Cloner le projet
git clone <repository-url>
cd esag_ged

# 2. Copier les variables d'environnement
cp .env.example .env

# 3. Démarrer avec Docker
docker-compose up -d

# 4. Attendre que les services démarrent (30-60 secondes)
docker-compose logs -f
```

### Accès à l'application

- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:5000
- **API Docs**: http://localhost:5000/api/docs
- **MinIO Console**: http://localhost:9001
- **pgAdmin**: http://localhost:5050

### Compte administrateur par défaut

```
Email: admin@esag.com
Mot de passe: Admin@12345
```

⚠️ **Important**: Changez ce mot de passe en production !

## 📦 Services Docker

Le projet utilise les services suivants :

- **PostgreSQL** (port 5432) - Base de données
- **MinIO** (ports 9000, 9001) - Stockage S3-compatible
- **Flask Backend** (port 5000) - API REST
- **React Frontend** (port 3003) - Interface utilisateur
- **pgAdmin** (port 5050) - Administration PostgreSQL

## 🔧 Commandes utiles

```bash
# Voir les logs
docker-compose logs -f

# Redémarrer un service
docker-compose restart backend

# Arrêter tout
docker-compose down

# Arrêter et supprimer les volumes (⚠️ supprime les données)
docker-compose down -v

# Reconstruire les images
docker-compose build --no-cache
```

## 📝 Prochaines étapes

1. Consultez la [documentation API](../api/API_REFERENCE.md)
2. Lisez le guide sur les [workflows](../features/WORKFLOWS.md)
3. Explorez l'[architecture](../architecture/ARCHITECTURE.md)

## ❓ Problèmes courants

### Le frontend ne se connecte pas au backend
- Vérifiez que tous les services sont démarrés : `docker-compose ps`
- Vérifiez les logs : `docker-compose logs backend`

### Erreur de migration de base de données
```bash
# Réinitialiser la base de données
docker-compose down -v
docker-compose up -d
```

### Port déjà utilisé
Modifiez les ports dans `docker-compose.yml` si nécessaire.
