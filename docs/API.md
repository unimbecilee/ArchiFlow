# Documentation API ESAG GED

## Accès à la documentation interactive

Une fois l'application lancée, la documentation interactive Swagger/OpenAPI est disponible à :

**http://localhost:5000/api/docs/**

## Authentification

Toutes les routes API (sauf `/api/auth/login`) nécessitent un token JWT dans le header :

```
Authorization: Bearer <votre_token>
```

### Obtenir un token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Réponse :
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Doe",
    "prenom": "John",
    "role": "User"
  }
}
```

## Endpoints principaux

### Documents

- `GET /api/documents/my` - Liste des documents de l'utilisateur
- `GET /api/documents/{id}` - Détails d'un document
- `POST /api/documents/upload` - Upload d'un document
- `PUT /api/documents/{id}` - Modifier un document
- `DELETE /api/documents/{id}` - Supprimer un document

### Workflow

- `GET /api/workflow` - Liste des workflows
- `POST /api/workflow` - Créer un workflow
- `POST /api/workflow/{id}/start` - Démarrer un workflow
- `POST /api/workflow/instance/{id}/approve` - Approuver une étape

### Corbeille

- `GET /api/trash` - Liste des éléments en corbeille
- `POST /api/trash/{id}/restore` - Restaurer un élément
- `DELETE /api/trash/{id}` - Supprimer définitivement

### Recherche

- `GET /api/search?q=terme` - Recherche globale

## Codes de statut HTTP

- `200` - Succès
- `201` - Créé
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Accès refusé
- `404` - Non trouvé
- `500` - Erreur serveur

## Format des réponses

### Succès
```json
{
  "status": "success",
  "data": { ... }
}
```

### Erreur
```json
{
  "status": "error",
  "error": "Message d'erreur",
  "details": { ... }
}
```

## Exemples d'utilisation

### Upload d'un document

```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  -F "titre=Mon document" \
  -F "description=Description du document"
```

### Recherche

```bash
curl -X GET "http://localhost:5000/api/search?q=rapport" \
  -H "Authorization: Bearer <token>"
```

Pour plus de détails, consultez la documentation interactive Swagger à `/api/docs/`

