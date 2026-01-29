#!/usr/bin/env python3
"""
API pour la gestion des dossiers ESAG GED
"""

from flask import Blueprint, request, jsonify
from AppFlask.db import db_connection
from psycopg2.extras import RealDictCursor
from AppFlask.api.auth import token_required
from AppFlask.models.folder import Folder
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('folders', __name__)

@bp.route('/folders/', methods=['GET'])
@token_required
def get_folders(current_user):
    """Récupérer la liste des dossiers accessibles par l'utilisateur"""
    try:
        user_id = current_user['id']
        user_role = current_user.get('role', 'user')
        parent_id = request.args.get('parent_id')
        
        conn = db_connection()
        if not conn:
            return jsonify({'error': 'Erreur de connexion à la base de données'}), 500
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Admin voit tous les dossiers, utilisateur normal voit seulement les siens
        if user_role.lower() == 'admin':
            if parent_id:
                cursor.execute("""
                    SELECT d.*, u.nom as proprietaire_nom, u.prenom as proprietaire_prenom,
                           (SELECT COUNT(*) FROM dossier WHERE parent_id = d.id) as sous_dossiers_count,
                           (SELECT COUNT(*) FROM document WHERE dossier_id = d.id) as documents_count
                    FROM dossier d
                    LEFT JOIN utilisateur u ON d.proprietaire_id = u.id
                    WHERE d.parent_id = %s
                    ORDER BY d.created_at DESC
                """, (parent_id,))
            else:
                cursor.execute("""
                    SELECT d.*, u.nom as proprietaire_nom, u.prenom as proprietaire_prenom,
                           (SELECT COUNT(*) FROM dossier WHERE parent_id = d.id) as sous_dossiers_count,
                           (SELECT COUNT(*) FROM document WHERE dossier_id = d.id) as documents_count
                    FROM dossier d
                    LEFT JOIN utilisateur u ON d.proprietaire_id = u.id
                    WHERE d.parent_id IS NULL
                    ORDER BY d.created_at DESC
                """)
        else:
            if parent_id:
                cursor.execute("""
                    SELECT d.*, u.nom as proprietaire_nom, u.prenom as proprietaire_prenom,
                           (SELECT COUNT(*) FROM dossier WHERE parent_id = d.id) as sous_dossiers_count,
                           (SELECT COUNT(*) FROM document WHERE dossier_id = d.id) as documents_count
                    FROM dossier d
                    LEFT JOIN utilisateur u ON d.proprietaire_id = u.id
                    WHERE d.parent_id = %s AND d.proprietaire_id = %s
                    ORDER BY d.titre
                """, (parent_id, user_id))
            else:
                cursor.execute("""
                    SELECT d.*, u.nom as proprietaire_nom, u.prenom as proprietaire_prenom,
                           (SELECT COUNT(*) FROM dossier WHERE parent_id = d.id) as sous_dossiers_count,
                           (SELECT COUNT(*) FROM document WHERE dossier_id = d.id) as documents_count
                    FROM dossier d
                    LEFT JOIN utilisateur u ON d.proprietaire_id = u.id
                    WHERE d.parent_id IS NULL AND d.proprietaire_id = %s
                    ORDER BY d.titre
                """, (user_id,))
        
        folders = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Formater les dates
        formatted_folders = []
        for folder in folders:
            folder_dict = dict(folder)
            if folder_dict.get('created_at'):
                folder_dict['created_at'] = folder_dict['created_at'].isoformat()
            if folder_dict.get('updated_at'):
                folder_dict['updated_at'] = folder_dict['updated_at'].isoformat()
            formatted_folders.append(folder_dict)
        
        return jsonify(formatted_folders), 200
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des dossiers: {str(e)}")
        # Retourner un tableau vide au lieu d'une erreur 500 si la table n'existe pas
        return jsonify([]), 200

@bp.route('/folders/<int:folder_id>', methods=['GET'])
@token_required
def get_folder(current_user, folder_id):
    """Récupérer les détails d'un dossier"""
    try:
        folder = Folder.get_by_id(folder_id)
        if not folder:
            return jsonify({'error': 'Dossier non trouvé'}), 404
        
        return jsonify(folder), 200
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du dossier: {str(e)}")
        return jsonify({'error': f'Erreur: {str(e)}'}), 500

@bp.route('/folders/', methods=['POST'])
@token_required
def create_folder(current_user):
    """Créer un nouveau dossier"""
    try:
        data = request.get_json()
        titre = data.get('titre') or data.get('nom')
        description = data.get('description')
        parent_id = data.get('parent_id')
        
        if not titre:
            return jsonify({'error': 'Le titre du dossier est requis'}), 400
        
        folder_id = Folder.create(
            title=titre,
            description=description,
            parent_id=parent_id,
            owner_id=current_user['id']
        )
        
        return jsonify({
            'message': 'Dossier créé avec succès',
            'folder_id': folder_id
        }), 201
        
    except Exception as e:
        logger.error(f"Erreur lors de la création du dossier: {str(e)}")
        return jsonify({'error': f'Erreur: {str(e)}'}), 500

@bp.route('/folders/<int:folder_id>', methods=['PUT'])
@token_required
def update_folder(current_user, folder_id):
    """Mettre à jour un dossier"""
    try:
        data = request.get_json()
        titre = data.get('titre') or data.get('nom')
        description = data.get('description')
        
        success = Folder.update(
            folder_id=folder_id,
            title=titre,
            description=description
        )
        
        if success:
            return jsonify({'message': 'Dossier mis à jour avec succès'}), 200
        else:
            return jsonify({'error': 'Échec de la mise à jour'}), 500
            
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du dossier: {str(e)}")
        return jsonify({'error': f'Erreur: {str(e)}'}), 500

@bp.route('/folders/<int:folder_id>', methods=['DELETE'])
@token_required
def delete_folder(current_user, folder_id):
    """Supprimer un dossier"""
    try:
        success = Folder.delete(folder_id)
        
        if success:
            return jsonify({'message': 'Dossier supprimé avec succès'}), 200
        else:
            return jsonify({'error': 'Échec de la suppression'}), 500
            
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du dossier: {str(e)}")
        return jsonify({'error': f'Erreur: {str(e)}'}), 500

@bp.route('/folders/', methods=['OPTIONS'])
@bp.route('/folders/<int:folder_id>', methods=['OPTIONS'])
def handle_folders_options(folder_id=None):
    """Gérer les requêtes OPTIONS pour CORS"""
    from flask import make_response
    response = make_response('', 200)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response
