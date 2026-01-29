from flask import Blueprint, jsonify
from AppFlask.db import db_connection
from AppFlask.api.auth import token_required
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('dashboard', __name__)

@bp.route('/documents/count', methods=['GET'])
@token_required
def get_documents_count(current_user):
    """Compte total de documents"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT COUNT(*) as count FROM document WHERE proprietaire_id = %s", (current_user['id'],))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({'count': result['count'] if result else 0}), 200
    except Exception as e:
        logger.error(f"Erreur count documents: {str(e)}")
        return jsonify({'count': 0}), 200

@bp.route('/archives/count', methods=['GET'])
@token_required
def get_archives_count(current_user):
    """Compte des documents archivés"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT COUNT(*) as count FROM document WHERE proprietaire_id = %s AND is_deleted = true", (current_user['id'],))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({'count': result['count'] if result else 0}), 200
    except Exception as e:
        logger.error(f"Erreur count archives: {str(e)}")
        return jsonify({'count': 0}), 200

@bp.route('/users/count', methods=['GET'])
@token_required
def get_users_count(current_user):
    """Compte total d'utilisateurs (admin uniquement)"""
    try:
        if current_user.get('role', '').lower() != 'admin':
            return jsonify({'count': 0}), 200
            
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT COUNT(*) as count FROM utilisateur")
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({'count': result['count'] if result else 0}), 200
    except Exception as e:
        logger.error(f"Erreur count users: {str(e)}")
        return jsonify({'count': 0}), 200

@bp.route('/folders/count', methods=['GET'])
@token_required
def get_folders_count(current_user):
    """Compte total de dossiers"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT COUNT(*) as count FROM dossier WHERE proprietaire_id = %s", (current_user['id'],))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({'count': result['count'] if result else 0}), 200
    except Exception as e:
        logger.error(f"Erreur count folders: {str(e)}")
        return jsonify({'count': 0}), 200

@bp.route('/documents/recent', methods=['GET'])
@token_required
def get_recent_documents(current_user):
    """Documents récents"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT id, titre, categorie, date_ajout, taille
            FROM document 
            WHERE proprietaire_id = %s
            ORDER BY date_ajout DESC
            LIMIT 5
        """, (current_user['id'],))
        
        documents = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(documents), 200
    except Exception as e:
        logger.error(f"Erreur documents récents: {str(e)}")
        return jsonify([]), 200

@bp.route('/folders/<int:folder_id>/breadcrumb', methods=['GET'])
@token_required
def get_folder_breadcrumb(current_user, folder_id):
    """Récupère le fil d'Ariane d'un dossier"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        breadcrumb = []
        current_id = folder_id
        
        # Remonter la hiérarchie jusqu'à la racine
        while current_id:
            cursor.execute("""
                SELECT id, nom, parent_id
                FROM dossier
                WHERE id = %s
            """, (current_id,))
            
            folder = cursor.fetchone()
            if not folder:
                break
                
            breadcrumb.insert(0, {
                'id': folder['id'],
                'nom': folder['nom']
            })
            
            current_id = folder['parent_id']
        
        cursor.close()
        conn.close()
        
        return jsonify(breadcrumb), 200
    except Exception as e:
        logger.error(f"Erreur breadcrumb: {str(e)}")
        return jsonify([]), 200
