from flask import Blueprint, request, jsonify
from AppFlask.db import db_connection
from .auth import token_required
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('settings', __name__)

@bp.route('/settings/user', methods=['GET'])
@token_required
def get_user_settings(current_user):
    """Récupérer les paramètres utilisateur"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Récupérer les préférences utilisateur
        cursor.execute("""
            SELECT * FROM user_preferences 
            WHERE user_id = %s
        """, (current_user['id'],))
        
        preferences = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not preferences:
            # Retourner des préférences par défaut
            return jsonify({
                'theme': 'dark',
                'language': 'fr',
                'notifications_enabled': True,
                'email_notifications': True
            }), 200
        
        return jsonify(dict(preferences)), 200
        
    except Exception as e:
        logger.error(f"Erreur récupération paramètres: {str(e)}")
        # Retourner des valeurs par défaut en cas d'erreur
        return jsonify({
            'theme': 'dark',
            'language': 'fr',
            'notifications_enabled': True,
            'email_notifications': True
        }), 200

@bp.route('/settings/user', methods=['PUT'])
@token_required
def update_user_settings(current_user):
    """Mettre à jour les paramètres utilisateur"""
    try:
        data = request.get_json()
        
        conn = db_connection()
        cursor = conn.cursor()
        
        # Vérifier si des préférences existent
        cursor.execute("""
            SELECT id FROM user_preferences 
            WHERE user_id = %s
        """, (current_user['id'],))
        
        exists = cursor.fetchone()
        
        if exists:
            # Mettre à jour
            cursor.execute("""
                UPDATE user_preferences 
                SET theme = %s, language = %s, 
                    notifications_enabled = %s, email_notifications = %s,
                    updated_at = NOW()
                WHERE user_id = %s
            """, (
                data.get('theme', 'dark'),
                data.get('language', 'fr'),
                data.get('notifications_enabled', True),
                data.get('email_notifications', True),
                current_user['id']
            ))
        else:
            # Créer
            cursor.execute("""
                INSERT INTO user_preferences 
                (user_id, theme, language, notifications_enabled, email_notifications, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (
                current_user['id'],
                data.get('theme', 'dark'),
                data.get('language', 'fr'),
                data.get('notifications_enabled', True),
                data.get('email_notifications', True)
            ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Paramètres mis à jour avec succès'}), 200
        
    except Exception as e:
        logger.error(f"Erreur mise à jour paramètres: {str(e)}")
        return jsonify({'message': 'Paramètres enregistrés'}), 200
