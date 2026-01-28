"""
Exemples d'utilisation du service MinIO et de l'adaptateur de stockage
Ce fichier montre comment adapter vos routes API existantes pour utiliser MinIO
"""

from flask import Blueprint, request, jsonify, send_file
from AppFlask.utils.storage_adapter import storage_adapter
from AppFlask.services.minio_service import minio_service
from werkzeug.utils import secure_filename
import io

# Exemple de blueprint
example_bp = Blueprint('example', __name__)


# ============================================================================
# EXEMPLE 1 : Upload de fichier avec l'adaptateur (recommandé)
# ============================================================================

@example_bp.route('/upload', methods=['POST'])
def upload_document():
    """
    Upload un document vers le stockage (MinIO ou Cloudinary selon config)
    """
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400
    
    try:
        # Upload via l'adaptateur (gère MinIO ou Cloudinary automatiquement)
        result = storage_adapter.upload_file(
            file_data=file.stream,
            filename=file.filename,
            content_type=file.content_type or 'application/octet-stream',
            is_thumbnail=False
        )
        
        if not result:
            return jsonify({'error': 'Échec de l\'upload'}), 500
        
        # Sauvegarder dans la base de données
        # db.execute("""
        #     INSERT INTO document (nom, url, storage_id, taille, type_mime)
        #     VALUES (%s, %s, %s, %s, %s)
        # """, (file.filename, result['url'], result['object_name'], 
        #       result['size'], result['content_type']))
        
        return jsonify({
            'success': True,
            'url': result['url'],
            'storage_id': result.get('object_name') or result.get('public_id'),
            'size': result.get('size'),
            'content_type': result.get('content_type')
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# EXEMPLE 2 : Téléchargement de fichier
# ============================================================================

@example_bp.route('/download/<storage_id>', methods=['GET'])
def download_document(storage_id):
    """
    Télécharge un document depuis le stockage
    """
    try:
        # Récupérer le contenu du fichier
        file_content = storage_adapter.get_file(storage_id)
        
        if not file_content:
            return jsonify({'error': 'Fichier non trouvé'}), 404
        
        # Récupérer les métadonnées depuis la base de données
        # row = db.execute("SELECT nom, type_mime FROM document WHERE storage_id = %s", (storage_id,))
        # filename = row['nom']
        # mimetype = row['type_mime']
        
        # Pour l'exemple, on utilise des valeurs par défaut
        filename = 'document.pdf'
        mimetype = 'application/pdf'
        
        return send_file(
            io.BytesIO(file_content),
            mimetype=mimetype,
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# EXEMPLE 3 : Suppression de fichier
# ============================================================================

@example_bp.route('/delete/<storage_id>', methods=['DELETE'])
def delete_document(storage_id):
    """
    Supprime un document du stockage
    """
    try:
        # Supprimer du stockage
        success = storage_adapter.delete_file(storage_id)
        
        if not success:
            return jsonify({'error': 'Échec de la suppression'}), 500
        
        # Supprimer de la base de données
        # db.execute("DELETE FROM document WHERE storage_id = %s", (storage_id,))
        
        return jsonify({'success': True, 'message': 'Document supprimé'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# EXEMPLE 4 : Upload de miniature
# ============================================================================

@example_bp.route('/upload-thumbnail', methods=['POST'])
def upload_thumbnail():
    """
    Upload une miniature (stockée dans un bucket séparé)
    """
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400
    
    file = request.files['file']
    
    try:
        # Upload en tant que miniature
        result = storage_adapter.upload_file(
            file_data=file.stream,
            filename=file.filename,
            content_type=file.content_type or 'image/jpeg',
            is_thumbnail=True  # Important : stocké dans le bucket thumbnails
        )
        
        if not result:
            return jsonify({'error': 'Échec de l\'upload'}), 500
        
        return jsonify({
            'success': True,
            'url': result['url'],
            'thumbnail_id': result.get('object_name') or result.get('public_id')
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# EXEMPLE 5 : Utilisation directe du service MinIO (avancé)
# ============================================================================

@example_bp.route('/minio/presigned-url/<object_name>', methods=['GET'])
def get_presigned_url(object_name):
    """
    Génère une URL pré-signée pour accès temporaire (MinIO uniquement)
    """
    try:
        from datetime import timedelta
        
        # Générer une URL valide 1 heure
        url = minio_service.get_presigned_url(
            object_name=object_name,
            is_thumbnail=False,
            expires=timedelta(hours=1)
        )
        
        if not url:
            return jsonify({'error': 'Impossible de générer l\'URL'}), 500
        
        return jsonify({
            'success': True,
            'url': url,
            'expires_in': '1 hour'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@example_bp.route('/minio/list', methods=['GET'])
def list_files():
    """
    Liste tous les fichiers dans MinIO (MinIO uniquement)
    """
    try:
        prefix = request.args.get('prefix', '')
        is_thumbnail = request.args.get('thumbnail', 'false').lower() == 'true'
        
        files = minio_service.list_files(prefix=prefix, is_thumbnail=is_thumbnail)
        
        return jsonify({
            'success': True,
            'count': len(files),
            'files': files
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@example_bp.route('/minio/info/<object_name>', methods=['GET'])
def get_file_info(object_name):
    """
    Récupère les informations d'un fichier (MinIO uniquement)
    """
    try:
        info = minio_service.get_file_info(object_name)
        
        if not info:
            return jsonify({'error': 'Fichier non trouvé'}), 404
        
        return jsonify({
            'success': True,
            'info': info
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# EXEMPLE 6 : Migration d'une route existante utilisant Cloudinary
# ============================================================================

# AVANT (avec Cloudinary)
"""
@app.route('/upload-old', methods=['POST'])
def upload_old():
    file = request.files['file']
    result = cloudinary.uploader.upload(file, folder='documents')
    
    db.execute(
        "INSERT INTO document (url, public_id) VALUES (%s, %s)",
        (result['secure_url'], result['public_id'])
    )
    
    return jsonify({'url': result['secure_url']})
"""

# APRÈS (avec l'adaptateur - compatible MinIO et Cloudinary)
@example_bp.route('/upload-new', methods=['POST'])
def upload_new():
    """
    Version migrée utilisant l'adaptateur de stockage
    """
    file = request.files['file']
    
    # L'adaptateur gère MinIO ou Cloudinary selon STORAGE_BACKEND
    result = storage_adapter.upload_file(
        file_data=file.stream,
        filename=file.filename,
        content_type=file.content_type
    )
    
    if not result:
        return jsonify({'error': 'Upload failed'}), 500
    
    # Sauvegarder avec le bon identifiant (object_name pour MinIO, public_id pour Cloudinary)
    storage_id = result.get('object_name') or result.get('public_id')
    
    # db.execute(
    #     "INSERT INTO document (url, storage_id) VALUES (%s, %s)",
    #     (result['url'], storage_id)
    # )
    
    return jsonify({'url': result['url'], 'storage_id': storage_id})


# ============================================================================
# EXEMPLE 7 : Upload avec validation
# ============================================================================

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@example_bp.route('/upload-validated', methods=['POST'])
def upload_validated():
    """
    Upload avec validation de type et taille
    """
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400
    
    file = request.files['file']
    
    # Validation du nom
    if file.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400
    
    # Validation de l'extension
    if not allowed_file(file.filename):
        return jsonify({'error': 'Type de fichier non autorisé'}), 400
    
    # Validation de la taille
    file.seek(0, 2)  # Aller à la fin
    file_size = file.tell()
    file.seek(0)  # Retour au début
    
    if file_size > MAX_FILE_SIZE:
        return jsonify({'error': 'Fichier trop volumineux'}), 400
    
    try:
        result = storage_adapter.upload_file(
            file_data=file.stream,
            filename=secure_filename(file.filename),
            content_type=file.content_type
        )
        
        if not result:
            return jsonify({'error': 'Échec de l\'upload'}), 500
        
        return jsonify({
            'success': True,
            'url': result['url'],
            'storage_id': result.get('object_name') or result.get('public_id'),
            'size': result.get('size'),
            'filename': file.filename
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# NOTES D'UTILISATION
# ============================================================================

"""
MIGRATION DE VOS ROUTES EXISTANTES :

1. Remplacer les imports Cloudinary :
   AVANT : import cloudinary, cloudinary.uploader
   APRÈS : from AppFlask.utils.storage_adapter import storage_adapter

2. Remplacer les appels d'upload :
   AVANT : cloudinary.uploader.upload(file, folder='documents')
   APRÈS : storage_adapter.upload_file(file.stream, file.filename, file.content_type)

3. Remplacer les appels de suppression :
   AVANT : cloudinary.uploader.destroy(public_id)
   APRÈS : storage_adapter.delete_file(storage_id)

4. Adapter la base de données :
   - Renommer 'public_id' en 'storage_id' (plus générique)
   - Stocker 'object_name' pour MinIO ou 'public_id' pour Cloudinary

5. Basculer entre les backends :
   - Modifier STORAGE_BACKEND=minio ou cloudinary dans .env
   - Aucun changement de code nécessaire !

AVANTAGES :
- Code unifié pour MinIO et Cloudinary
- Migration progressive possible
- Facile de tester les deux backends
- Prêt pour d'autres backends (AWS S3, Azure Blob, etc.)
"""
