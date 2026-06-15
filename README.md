# ArchiFlow v3

GED et workflows d'approbation pour l'entreprise — backend **Go**, frontend **Next.js 14**, stockage **MinIO**, temps réel **WebSocket** + **Redis**.

---

## Fonctionnalités

| Domaine | Contenu |
|--------|---------|
| **Documents** | Dossiers, import, aperçu PDF/image, versioning, corbeille, recherche (FTS), favoris, verrouillage |
| **Workflows** | Validation 2 étapes (Responsable → Administrateur), approbations avec **aperçu + attestation** avant décision |
| **Collaboration** | Partages, commentaires, tags, notifications in-app + email (SMTP) |
| **Temps réel** | WebSocket `GET /api/ws` (défaut) ou SSE legacy ; broker Redis multi-instances |
| **Sessions** | Refresh opaque HttpOnly, rotation, révocation, idle timeout, plafond appareils |
| **Admin** | Utilisateurs, workflows, rôles (`admin`, `manager`, `validator`, `archivist`, `user`) |
| **ArchiFlow +** | Intégration Pydio Cells (profil Docker `cells`) — collaboration avancée, SSO |
| **Bureautique** | OnlyOffice (profil Docker `office`) — édition Word/Excel/PPT |

---

## Architecture

```mermaid
flowchart LR
  Browser["Navigateur :3000"]
  Next["Next.js proxy /api"]
  API["API Go :5010"]
  PG[(PostgreSQL)]
  MinIO[(MinIO)]
  Redis[(Redis)]
  Cells["Pydio Cells :4001"]

  Browser --> Next
  Next --> API
  Browser -->|WebSocket| API
  API --> PG
  API --> MinIO
  API --> Redis
  API -.->|optionnel| Cells
```

Le navigateur passe par le frontend (`/api/*` → backend). Les notifications utilisent `ws://host/api/ws` (ou WS direct via `NEXT_PUBLIC_API_URL` si le proxy Next ne fait pas l'upgrade).

---

## Prérequis

- **Docker** + **Docker Compose** v2
- Dev local optionnel : **Go 1.22+**, **Node.js 20+**

---

## Démarrage rapide

```bash
cd archiflow_v3
cp .env.example .env
docker compose up --build -d
```

Attendre que `postgres`, `minio`, `redis` et `backend` soient healthy, puis ouvrir **http://localhost:3000**.

### URLs

| Service | URL | Identifiants |
|---------|-----|--------------|
| Frontend | http://localhost:3000 | — |
| API Go | http://localhost:5010 | JWT / cookie refresh |
| MinIO API | http://localhost:9000 | `minioadmin` / `minioadmin123` |
| MinIO Console | http://localhost:9001 | idem |
| Redis | localhost:6379 | — |

### Comptes seed (premier démarrage)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@archiflow.local` | `Admin1234!` |
| Manager | `manager@archiflow.local` | `Manager1234!` |
| Validateur | `validator@archiflow.local` | `Validator1234!` |
| Archiviste | `archivist@archiflow.local` | `Archivist1234!` |

Variables : `SEED_ADMIN_*`, `SEED_MANAGER_*`, `SEED_VALIDATOR_*`, `SEED_ARCHIVIST_*` dans `.env`.

### Profils Docker optionnels

```bash
# Collaboration avancée (Pydio Cells + MySQL)
docker compose --profile cells up -d

# Édition bureautique OnlyOffice
docker compose --profile office up -d
```

Cells : http://localhost:4001 — configurer `pydio_cells/.env` (voir commentaires en bas de `.env.example`).

### Commandes utiles

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
docker compose down -v   # supprime les volumes (données)
```

### Test WebSocket notifications

```bash
node scripts/test-realtime-ws.mjs http://localhost:5010
```

---

## Développement local (hors Docker)

### Backend

```bash
cd backend
go mod download
# DATABASE_URL avec localhost:5432, MINIO_ENDPOINT=localhost:9000
go run cmd/api/main.go
```

API : http://localhost:5000 (ou `SERVER_PORT`).

### Frontend

```bash
cd frontend
npm install
# .env : INTERNAL_API_URL=http://localhost:5010
npm run dev
```

UI : http://localhost:3000 — le proxy Next redirige `/api/*` vers le backend.

---

## Configuration

Fichier unique **`.env`** à la racine (modèle : [`.env.example`](.env.example)).

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | PostgreSQL |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Tokens (min. 32 car. en prod) |
| `JWT_SESSION_IDLE_MINUTES` | Expiration refresh si inactif |
| `JWT_MAX_SESSIONS_PER_USER` | Limite sessions par utilisateur |
| `REDIS_URL` | Pub/sub temps réel (`redis://redis:6379/0` en Docker) |
| `NEXT_PUBLIC_REALTIME_MODE` | `ws` (défaut) ou `sse` |
| `NEXT_PUBLIC_API_URL` | WS direct navigateur + build frontend Docker |
| `SMTP_*` | Emails (Brevo, etc.) — optionnel |
| `PYDIO_*` | Intégration Cells — voir `.env.example` |

Après modification de `NEXT_PUBLIC_*`, **rebuild** le frontend Docker :

```bash
docker compose build frontend && docker compose up -d frontend
```

---

## Authentification

- **Access token** JWT court (mémoire SPA, ~15 min)
- **Refresh token** opaque en cookie `HttpOnly`, rotation à chaque refresh
- Invalidation : logout, changement mot de passe, désactivation admin, dépassement idle / max sessions

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | Connexion |
| `POST /api/auth/refresh` | Nouvel access token |
| `POST /api/auth/logout` | Révocation session |
| `GET /api/auth/me` | Profil (protégé) |

---

## Workflows

Workflow système **Validation Document** :

1. **Responsable** — rôles `manager`, `validator`, `admin`
2. **Administrateur** — rôle `admin`

Côté UI (**Workflows → Approbations**) : aperçu document, case d'attestation obligatoire, commentaire, puis Approuver / Rejeter.

API : `POST /api/workflows/validation/start`, `POST /api/workflows/instances/:id/approve|reject`, etc.

---

## Temps réel

| Canal | Usage |
|-------|--------|
| `GET /api/ws?token=…` | Notifications + compteurs workflow (push) |
| `GET /api/notifications/stream` | Legacy SSE (poll DB) si `NEXT_PUBLIC_REALTIME_MODE=sse` |

Redis synchronise les événements entre plusieurs replicas backend.

---

## Structure du projet

```
archiflow_v3/
├── backend/                 # API Go (Echo, GORM)
│   ├── cmd/api/             # Point d'entrée
│   └── internal/
│       ├── handlers/        # HTTP
│       ├── services/        # Métier
│       ├── repository/      # Données
│       ├── realtime/        # Hub WS + broker Redis
│       └── models/
├── frontend/                # Next.js 14, Tailwind, Phosphor Icons
│   └── src/
│       ├── app/             # App Router
│       ├── components/      # UI (CRUD, workflows, dashboard)
│       ├── hooks/           # WS / SSE realtime
│       └── services/        # Client API
├── pydio_cells/             # Build Cells (profil cells)
├── scripts/                 # test-realtime-ws.mjs, smoke_e2e.sh
├── docker-compose.yml
└── .env.example
```

---

## Tests

```bash
# Backend
cd backend && go test ./...

# Frontend (build)
cd frontend && npm run build

# Smoke E2E (stack Docker requise)
./scripts/smoke_e2e.sh
```

---

## Stack technique

**Backend** — Go 1.22, Echo, GORM, PostgreSQL, MinIO, Redis, gorilla/websocket, JWT, Zap

**Frontend** — Next.js 14, TypeScript, Tailwind CSS, Radix UI, Zustand, Axios, Framer Motion, Geist

---

## Format API

Réponses JSON habituelles :

```json
{
  "success": true,
  "message": "Description",
  "data": {}
}
```

Erreurs : `success: false`, champ `error` ou `message`.

---

## Licence

Propriétaire — Landry D. / ArchiFlow.


