# Guide de Migration vers MinIO

## Objectif

Ce guide explique comment migrer le stockage de fichiers de Cloudinary vers MinIO dans ESAG GED.

## Pourquoi MinIO ?

- ✅ **Open-source** et gratuit
- ✅ **Compatible S3** - Standard de l'industrie
- ✅ **Performances** - Stockage local rapide
- ✅ **Contrôle total** - Pas de dépendance externe
- ✅ **Pas de coûts** - Hébergement local
- ✅ **Scalable** - Peut évoluer vers un cluster

## Changements apportés

### 1. Nouveaux fichiers créés

- `docker-compose.yml` - Infrastructure Docker (PostgreSQL + MinIO + PgAdmin)
- `.env.docker` - Configuration Docker
- `docker-start.sh` - Script de démarrage
- `AppFlask/services/minio_service.py` - Service MinIO
- `AppFlask/utils/storage_adapter.py` - Adaptateur unifié
- `docs/DOCKER_SETUP.md` - Documentation complète
- `docs/MIGRATION_MINIO.md` - Ce guide

### 2. Fichiers modifiés

- `requirements/base.txt` - Ajout de `minio==7.2.5`
- `.env.example` - Ajout variables MinIO

### 3. Architecture du stockage

```
┌─────────────────────────────────────────┐
│         Application ESAG GED            │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │    storage_adapter.py             │ │
│  │  (Adaptateur unifié)              │ │
│  └───────────┬───────────────────────┘ │
│              │                          │
│      ┌───────┴────────┐                │
│      │                │                │
│  ┌───▼────┐      ┌───▼────┐          │
│  │ MinIO  │      │Cloudinary│         │
│  │Service │      │ (legacy) │         │
│  └────────┘      └──────────┘         │
└─────────────────────────────────────────┘
```

## Étapes de migration

### Étape 1 : Installer les dépendances

```bash
# Installer la bibliothèque MinIO
pip install -r requirements/base.txt

# Ou directement
pip install minio==7.2.5
```

### Étape 2 : Démarrer l'infrastructure Docker

```bash
# Rendre le script exécutable
chmod +x docker-start.sh

# Démarrer PostgreSQL et MinIO
./docker-start.sh
```

Vérifier que les services sont démarrés :
```bash
docker-compose ps
```

### Étape 3 : Configurer les variables d'environnement

Copier le fichier de configuration Docker :
```bash
cp .env.docker .env
```

Ou modifier votre `.env` existant :
```env
# Choisir le backend de stockage
STORAGE_BACKEND=minio

# Configuration MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_DOCUMENTS=esag-documents
MINIO_BUCKET_THUMBNAILS=esag-thumbnails
MINIO_USE_SSL=false

# PostgreSQL
DATABASE_URL=postgresql://esag_user:esag_password_2024@localhost:5432/esag_ged
```

### Étape 4 : Tester la connexion MinIO

```bash
# Démarrer l'application
python main.py
```

L'application devrait afficher :
```
✅ Connexion MinIO établie: localhost:9000
✅ Bucket créé: esag-documents
✅ Bucket créé: esag-thumbnails
```

### Étape 5 : Vérifier via la console MinIO

1. Ouvrir http://localhost:9001
2. Se connecter : `minioadmin` / `minioadmin123`
3. Vérifier que les buckets sont créés
4. Uploader un document de test via l'application
5. Vérifier qu'il apparaît dans MinIO

## Utilisation de l'adaptateur de stockage

### Dans le code existant

L'adaptateur `storage_adapter` fonctionne de manière transparente :

```python
from AppFlask.utils.storage_adapter import storage_adapter

# Upload un fichier
result = storage_adapter.upload_file(
    file_data=file.stream,
    filename=file.filename,
    content_type=file.content_type,
    is_thumbnail=False
)

if result:
    url = result['url']
    object_name = result['object_name']  # ou 'public_id' pour Cloudinary
    
# Supprimer un fichier
success = storage_adapter.delete_file(
    object_name=object_name,
    is_thumbnail=False
)

# Récupérer l'URL
url = storage_adapter.get_file_url(object_name)

# Télécharger le contenu
content = storage_adapter.get_file(object_name)
```

### Basculer entre MinIO et Cloudinary

Il suffit de changer la variable d'environnement :

```env
# Utiliser MinIO
STORAGE_BACKEND=minio

# Ou utiliser Cloudinary
STORAGE_BACKEND=cloudinary
```

## Migration des fichiers existants

Si vous avez des fichiers sur Cloudinary que vous souhaitez migrer :

### Script de migration (à créer)

```python
# migration_cloudinary_to_minio.py
import cloudinary
import cloudinary.api
from AppFlask.services.minio_service import minio_service
import requests

def migrate_files():
    """Migre tous les fichiers de Cloudinary vers MinIO"""
    
    # Lister tous les fichiers Cloudinary
    resources = cloudinary.api.resources(
        type='upload',
        max_results=500
    )
    
    for resource in resources['resources']:
        public_id = resource['public_id']
        url = resource['secure_url']
        
        print(f"Migration de {public_id}...")
        
        # Télécharger depuis Cloudinary
        response = requests.get(url)
        if response.status_code == 200:
            # Upload vers MinIO
            from io import BytesIO
            file_data = BytesIO(response.content)
            
            result = minio_service.upload_file(
                file_data=file_data,
                filename=public_id,
                content_type=resource.get('resource_type', 'application/octet-stream')
            )
            
            if result:
                print(f"✅ Migré : {public_id}")
            else:
                print(f"❌ Échec : {public_id}")

if __name__ == '__main__':
    migrate_files()
```

## Avantages de la nouvelle architecture

### Performance
- **Latence réduite** : Stockage local vs cloud externe
- **Bande passante** : Pas de limite de transfert
- **Vitesse** : Accès direct au système de fichiers

### Coûts
- **Gratuit** : Pas de frais Cloudinary
- **Prévisible** : Coûts de stockage locaux uniquement

### Contrôle
- **Données locales** : Contrôle total
- **Backup** : Stratégie de sauvegarde personnalisée
- **Sécurité** : Pas de dépendance externe

### Développement
- **Offline** : Développement sans connexion internet
- **Rapidité** : Tests plus rapides
- **Débogage** : Accès direct aux fichiers

## Compatibilité

### API S3
MinIO est compatible avec l'API S3 d'Amazon, ce qui signifie :
- Facile de migrer vers AWS S3 en production
- Compatible avec de nombreux outils
- Standard de l'industrie

### Cloudinary
L'adaptateur garde la compatibilité avec Cloudinary :
- Basculer facilement entre les deux
- Utiliser Cloudinary en production si nécessaire
- Migration progressive possible

## Production

Pour la production, plusieurs options :

### Option 1 : MinIO en production
```bash
# Déployer MinIO sur un serveur dédié
# Configurer SSL/TLS
# Mettre en place la réplication
```

### Option 2 : AWS S3
```bash
# MinIO est compatible S3
# Changer simplement l'endpoint vers S3
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_ACCESS_KEY=<AWS_ACCESS_KEY>
MINIO_SECRET_KEY=<AWS_SECRET_KEY>
```

### Option 3 : Garder Cloudinary
```bash
# Rester sur Cloudinary en production
STORAGE_BACKEND=cloudinary
```

## Résolution de problèmes

### MinIO ne démarre pas
```bash
docker-compose logs minio
docker-compose restart minio
```

### Erreur de connexion
```bash
# Vérifier que MinIO est accessible
curl http://localhost:9000/minio/health/live

# Vérifier les variables d'environnement
cat .env | grep MINIO
```

### Buckets non créés
```bash
# Recréer les buckets manuellement
docker-compose up minio-init
```

## Commandes utiles

```bash
# Voir les fichiers dans MinIO
docker exec esag_ged_minio ls -la /data/esag-documents/

# Backup MinIO
docker exec esag_ged_minio tar czf /tmp/backup.tar.gz /data
docker cp esag_ged_minio:/tmp/backup.tar.gz ./minio-backup.tar.gz

# Restaurer MinIO
docker cp ./minio-backup.tar.gz esag_ged_minio:/tmp/
docker exec esag_ged_minio tar xzf /tmp/backup.tar.gz -C /
```

## Prochaines étapes

1. ✅ Infrastructure Docker configurée
2. ✅ Service MinIO implémenté
3. ✅ Adaptateur de stockage créé
4. ⏳ Adapter les routes API existantes
5. ⏳ Tester l'upload/download
6. ⏳ Migrer les fichiers existants (optionnel)
7. ⏳ Documentation utilisateur

## Support

Pour toute question :
- Consulter `docs/DOCKER_SETUP.md`
- Vérifier les logs : `docker-compose logs -f`
- Tester la console MinIO : http://localhost:9001
