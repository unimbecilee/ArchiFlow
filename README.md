# ArchiFlow

**Système de Gestion Électronique de Documents (GED) avec intégration Pydio Cells**

ArchiFlow est une solution complète de gestion documentaire qui combine un backend Flask, un frontend React moderne, et une intégration avec Pydio Cells pour la collaboration et l'archivage.

## 🚀 Fonctionnalités

### Gestion Documentaire
- **Upload & Stockage** - Téléversement de documents avec stockage MinIO
- **OCR Intégré** - Extraction automatique de texte des documents scannés
- **Versioning** - Historique complet des versions de documents
- **Tags & Métadonnées** - Organisation flexible des documents
- **Recherche Avancée** - Recherche full-text et par métadonnées

### Workflows
- **Validation** - Workflows de validation multi-niveaux
- **Notifications** - Alertes en temps réel par email et in-app
- **Archivage** - Processus d'archivage avec approbation

### Collaboration
- **Partage** - Partage de documents avec permissions granulaires
- **Commentaires** - Discussion sur les documents
- **Checkout/Checkin** - Verrouillage de documents pour édition

### Intégration Pydio Cells
- **Synchronisation** - Sync bidirectionnelle des documents
- **Archivage Pydio** - Demandes d'archivage depuis Pydio
- **Webhooks** - Notifications automatiques des événements

## 📁 Structure du Projet

```
archiflow/
├── AppFlask/              # Backend Flask
│   ├── api/               # Endpoints REST API
│   ├── models/            # Modèles de données
│   ├── services/          # Services métier
│   └── utils/             # Utilitaires
│
├── frontend/              # Frontend React
│   ├── src/
│   │   ├── components/    # Composants React
│   │   ├── pages/         # Pages
│   │   ├── services/      # Services API
│   │   └── contexts/      # Contextes React
│   └── public/
│
├── pydio_cells/           # Intégration Pydio Cells
│   ├── frontend/plugins/  # Plugins Pydio
│   └── *.sh               # Scripts de configuration
│
├── docs/                  # Documentation
├── docker-compose.yml     # Orchestration Docker
└── Dockerfile             # Image Docker backend
```

## 🛠️ Installation

### Prérequis
- Docker & Docker Compose
- Node.js 18+ (pour le développement frontend)
- Python 3.11+ (pour le développement backend)

### Démarrage Rapide

```bash
# Cloner le projet
git clone <repository-url>
cd archiflow

# Copier la configuration
cp .env.exemple .env

# Démarrer les services
docker-compose up -d

# Vérifier les services
docker-compose ps
```

### Services Disponibles

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Interface utilisateur React |
| **Backend API** | http://localhost:5000 | API REST Flask |
| **Pydio Cells** | http://localhost:8080 | Gestion de fichiers |
| **MinIO Console** | http://localhost:9001 | Stockage objets |

### Identifiants par Défaut

**Pydio Cells:**
- Login: `superadmin`
- Password: `superadmin`

**MinIO:**
- Access Key: `minioadmin`
- Secret Key: `minioadmin123`

## 📖 Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/API.md)
- [Guide Scanner](docs/SCANNER_USER_GUIDE.md)
- [Intégration Pydio](docs/PYDIO_INTEGRATION.md)
- [Configuration Docker](docs/DOCKER_SETUP.md)

## 🔧 Développement

### Backend (Flask)

```bash
cd AppFlask
pip install -r ../requirements.txt
python -m flask run --debug
```

### Frontend (React)

```bash
cd frontend
npm install
npm start
```

## 📝 API Endpoints Principaux

### Documents
- `GET /api/documents` - Liste des documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/{id}` - Détail document
- `DELETE /api/documents/{id}` - Supprimer document

### Workflows
- `POST /api/validation-workflow/start` - Démarrer validation
- `GET /api/workflow/pending` - Validations en attente
- `POST /api/workflow/{id}/approve` - Approuver

### Pydio Integration
- `GET /api/api/v1/pydio/health` - Santé intégration
- `POST /api/api/v1/pydio/archive-requests` - Demande archivage
- `GET /api/api/v1/pydio/stats` - Statistiques

## 🐳 Docker

### Commandes Utiles

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Reconstruire les images
docker-compose build --no-cache

# Arrêter les services
docker-compose down

# Supprimer les volumes (reset complet)
docker-compose down -v
```

## 📄 Licence

MIT License - Voir [LICENSE](LICENSE) pour plus de détails.

---

**ArchiFlow** - Gestion documentaire moderne et collaborative
