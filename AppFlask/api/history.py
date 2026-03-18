#!/usr/bin/env python3
"""
API pour l'historique des actions ArchiFlow
"""

from flask import Blueprint, request, jsonify
from AppFlask.db import db_connection
from psycopg2.extras import RealDictCursor
from AppFlask.api.auth import token_required
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('history', __name__)

@bp.route('/history', methods=['GET'])
@bp.route('/history/', methods=['GET'])
@token_required
def get_history(current_user):
    """Récupérer l'historique des actions"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        action_type = request.args.get('action_type')
        entity_type = request.args.get('entity_type')
        user_id = request.args.get('user_id')
        
        offset = (page - 1) * per_page
        
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Construire la requête
        where_conditions = []
        params = []
        
        if action_type:
            where_conditions.append("action_type = %s")
            params.append(action_type)
        
        if entity_type:
            where_conditions.append("entity_type = %s")
            params.append(entity_type)
        
        if user_id:
            where_conditions.append("user_id = %s")
            params.append(user_id)
        
        where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
        
        # Compter le total
        cursor.execute(f"""
            SELECT COUNT(*) as total 
            FROM history 
            WHERE {where_clause}
        """, params)
        
        total = cursor.fetchone()['total']
        
        # Récupérer l'historique
        cursor.execute(f"""
            SELECT h.*, u.nom, u.prenom, u.email
            FROM history h
            LEFT JOIN utilisateur u ON h.user_id = u.id
            WHERE {where_clause}
            ORDER BY h.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [per_page, offset])
        
        history = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'history': [dict(h) for h in history],
            'total': total,
            'page': page,
            'per_page': per_page,
            'has_next': (page * per_page) < total,
            'has_prev': page > 1
        }), 200
        
    except Exception as e:
        logger.error(f"Erreur récupération historique: {str(e)}")
        return jsonify({'message': f'Erreur lors de la récupération: {str(e)}'}), 500

@bp.route('/history/<int:history_id>', methods=['GET'])
@token_required
def get_history_detail(current_user, history_id):
    """Récupérer les détails d'une entrée d'historique"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT h.*, u.nom, u.prenom, u.email
            FROM history h
            LEFT JOIN utilisateur u ON h.user_id = u.id
            WHERE h.id = %s
        """, (history_id,))
        
        history = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not history:
            return jsonify({'message': 'Entrée non trouvée'}), 404
        
        return jsonify(dict(history)), 200
        
    except Exception as e:
        logger.error(f"Erreur récupération détail historique: {str(e)}")
        return jsonify({'message': f'Erreur lors de la récupération: {str(e)}'}), 500

@bp.route('/history', methods=['OPTIONS'])
def handle_history_options():
    return '', 200
