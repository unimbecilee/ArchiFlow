# 📁 ESAG GED - Système de Gestion Électronique de Documents

[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

Système complet de gestion électronique de documents (GED) avec workflows de validation, partage sécurisé et stockage S3-compatible.

## ✨ Fonctionnalités principales

### 📄 Gestion des documents
- ✅ Upload et stockage sécurisé (MinIO S3)
- ✅ Versioning automatique
- ✅ Prévisualisation et téléchargement
- ✅ Organisation en dossiers
- ✅ Recherche avancée et filtres
- ✅ Métadonnées et tags

### 🔄 Workflows de validation
- ✅ Workflows personnalisables
- ✅ Validation séquentielle ou parallèle
- ✅ Approbation par rôle ou utilisateur
- ✅ Historique complet des validations
- ✅ Notifications en temps réel

### 🔐 Sécurité et partage
- ✅ Authentification JWT
- ✅ Gestion des rôles et permissions
- ✅ Partage sécurisé avec expiration
- ✅ Liens publics temporaires
- ✅ Audit trail complet

### 📊 Tableau de bord
- ✅ Statistiques en temps réel
- ✅ Activités récentes
- ✅ Documents favoris
- ✅ Notifications
- ✅ Gestion de la corbeille

## 🚀 Démarrage rapide

### Avec Docker (recommandé)

```bash
# 1. Cloner le projet
git clone <repository-url>
cd esag_ged

# 2. Copier les variables d'environnement
cp .env.example .env

# 3. Démarrer tous les services
docker-compose up -d

# 4. Accéder à l'application
# Frontend: http://localhost:3003
# Backend: http://localhost:5000
# API Docs: http://localhost:5000/api/docs
```

### Compte administrateur par défaut

```
Email: admin@esag.com
Mot de passe: Admin@12345
```

⚠️ **Changez ce mot de passe en production !**

## 🏗️ Architecture

### Stack technique

**Backend**
- Python 3.13
- Flask 3.0
- PostgreSQL 16
- Alembic (migrations)
- MinIO (stockage S3)

**Frontend**
- React 18
- TypeScript
- Chakra UI
- React Query
- Axios

**Infrastructure**
- Docker & Docker Compose
- Nginx (production)
- pgAdmin (administration)

### Structure du projet

```
esag_ged/
├── AppFlask/              # Backend Flask
│   ├── api/              # Routes API
│   ├── models/           # Modèles de données
│   ├── services/         # Logique métier
│   └── utils/            # Utilitaires
├── frontend/             # Frontend React
│   ├── src/
│   │   ├── components/  # Composants React
│   │   ├── services/    # Services API
│   │   └── config/      # Configuration
├── migrations/           # Migrations Alembic
│   └── versions/        # Migration unique complète
├── docs_clean/          # Documentation organisée
├── docker-compose.yml   # Configuration Docker
└── README.md           # Ce fichier
```

## 📚 Documentation

- [Guide de démarrage rapide](docs_clean/guides/QUICK_START.md)
- [Configuration Docker](docs_clean/guides/DOCKER_SETUP.md)
- [Architecture](docs_clean/architecture/ARCHITECTURE.md)
- [Base de données](docs_clean/architecture/DATABASE.md)
- [API Reference](docs_clean/api/API_REFERENCE.md)

## 🔧 Développement

### Prérequis
- Python 3.13+
- Node.js 18+
- PostgreSQL 16+
- Docker (optionnel)

### Installation locale

```bash
# Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install

# Base de données
alembic upgrade head

# Démarrer le backend
python main.py

# Démarrer le frontend (nouveau terminal)
cd frontend
npm start
```

### Variables d'environnement

Consultez `.env.example` pour la liste complète des variables.

**Essentielles :**
```env
# Base de données
DATABASE_URL=postgresql://esag_user:password@localhost:5432/esag_ged

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# JWT
SECRET_KEY=your-secret-key-here
```

## 🧪 Tests

```bash
# Backend
pytest AppFlask/tests/

# Frontend
cd frontend
npm test
```

## 📦 Déploiement

### Production avec Docker

```bash
# Build et démarrage
docker-compose -f docker-compose.prod.yml up -d

# Vérifier les logs
docker-compose logs -f
```

### Variables d'environnement production

```env
FLASK_ENV=production
DEBUG=False
SECRET_KEY=<strong-random-key>
DATABASE_URL=<production-database-url>
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines.

## 📝 Changelog

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique des versions.

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

## 👥 Équipe

Développé pour ESAG - École Supérieure Africaine de Gestion

## 🆘 Support

- 📧 Email: support@esag.com
- 📖 Documentation: [docs_clean/](docs_clean/)
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)

## 🎯 Roadmap

- [ ] Application mobile (React Native)
- [ ] Signature électronique
- [ ] OCR avancé avec IA
- [ ] Intégration Microsoft 365
- [ ] Recherche sémantique
- [ ] Export PDF avec watermark

---

**Made with ❤️ by the ESAG GED Team**
