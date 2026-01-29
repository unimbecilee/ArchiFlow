"""
API pour la modification des métadonnées de documents
"""

from flask import Blueprint, request, jsonify
from AppFlask.db import db_connection
from AppFlask.api.auth import token_required, log_user_action
from AppFlask.utils.permissions import check_document_permission, PERMISSION_MODIFICATION
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('document_metadata', __name__)

@bp.route('/documents/<int:doc_id>/metadata', methods=['PUT'])
@token_required
def update_document_metadata(current_user, doc_id):
    """
    Mettre à jour les métadonnées d'un document (titre, description, tags, etc.)
    Nécessite la permission 'modification'
    """
    try:
        # Vérifier la permission de modification
        if not check_document_permission(doc_id, current_user['id'], PERMISSION_MODIFICATION):
            return jsonify({
                'success': False,
                'message': 'Vous n\'avez pas la permission de modifier ce document'
            }), 403
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Données JSON requises'
            }), 400
        
        conn = db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Erreur de connexion à la base de données'
            }), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Vérifier que le document existe
        cursor.execute("SELECT id, titre FROM document WHERE id = %s", (doc_id,))
        document = cursor.fetchone()
        
        if not document:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Document non trouvé'
            }), 404
        
        # Construire la requête de mise à jour dynamiquement
        update_fields = []
        update_values = []
        
        # Champs modifiables
        if 'titre' in data:
            update_fields.append("titre = %s")
            update_values.append(data['titre'])
        
        if 'description' in data:
            update_fields.append("description = %s")
            update_values.append(data['description'])
        
        if 'tags' in data:
            update_fields.append("tags = %s")
            update_values.append(data['tags'])
        
        if 'categorie' in data:
            update_fields.append("categorie = %s")
            update_values.append(data['categorie'])
        
        if 'confidentialite' in data:
            update_fields.append("confidentialite = %s")
            update_values.append(data['confidentialite'])
        
        if not update_fields:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Aucune donnée à mettre à jour'
            }), 400
        
        # Ajouter la date de modification
        update_fields.append("date_modification = NOW()")
        
        # Construire et exécuter la requête
        update_query = f"""
            UPDATE document 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, titre, description, tags, categorie, confidentialite, date_modification
        """
        update_values.append(doc_id)
        
        cursor.execute(update_query, update_values)
        updated_doc = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Logger l'action
        log_user_action(
            current_user['id'],
            'DOCUMENT_METADATA_UPDATE',
            f"Métadonnées du document '{document['titre']}' (ID: {doc_id}) mises à jour",
            request
        )
        
        return jsonify({
            'success': True,
            'message': 'Métadonnées mises à jour avec succès',
            'document': dict(updated_doc)
        }), 200
        
    except Exception as e:
        logger.error(f"Erreur mise à jour métadonnées: {e}")
        return jsonify({
            'success': False,
            'message': f'Erreur lors de la mise à jour: {str(e)}'
        }), 500


@bp.route('/documents/<int:doc_id>/permissions', methods=['GET'])
@token_required
def get_user_document_permissions(current_user, doc_id):
    """
    Récupérer les permissions de l'utilisateur sur un document
    """
    try:
        from AppFlask.utils.permissions import get_user_permissions
        
        permissions = get_user_permissions(doc_id, current_user['id'])
        
        return jsonify({
            'success': True,
            'permissions': permissions
        }), 200
        
    except Exception as e:
        logger.error(f"Erreur récupération permissions: {e}")
        return jsonify({
            'success': False,
            'message': f'Erreur lors de la récupération: {str(e)}'
        }), 500
