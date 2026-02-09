#!/usr/bin/env python3
"""
Server-Sent Events (SSE) pour les notifications en temps réel
"""

from flask import Blueprint, Response, stream_with_context, request, jsonify
from AppFlask.db import db_connection
from psycopg2.extras import RealDictCursor
import logging
import json
import time
import jwt
import os

logger = logging.getLogger(__name__)

bp = Blueprint('notifications_sse', __name__)

@bp.route('/notifications/stream', methods=['GET'])
def notification_stream():
    """
    Stream SSE pour les notifications en temps réel
    Envoie le compteur de notifications non lues toutes les 5 secondes
    """
    # Récupérer le token depuis les query parameters
    token = request.args.get('token')
    if not token:
        return jsonify({'message': 'Token manquant'}), 401
    
    # Valider le token
    try:
        secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        user_id = payload.get('user_id')
        
        if not user_id:
            return jsonify({'message': 'Token invalide'}), 401
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Token expiré'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Token invalide'}), 401
    
    def generate():
        user_id_local = user_id
        last_count = -1
        
        # Envoyer un message de connexion
        yield f"data: {json.dumps({'type': 'connected', 'message': 'Stream connecté'})}\n\n"
        
        while True:
            try:
                conn = db_connection()
                if not conn:
                    time.sleep(5)
                    continue
                    
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                
                # Récupérer le nombre de notifications non lues
                cursor.execute("""
                    SELECT COUNT(*) as count 
                    FROM notifications 
                    WHERE user_id = %s AND is_read = false
                """, (user_id_local,))
                
                result = cursor.fetchone()
                current_count = result['count'] if result else 0
                
                # Récupérer les dernières notifications si le compteur a changé
                if current_count != last_count:
                    cursor.execute("""
                        SELECT id, title, message, type, created_at, is_read
                        FROM notifications 
                        WHERE user_id = %s 
                        ORDER BY created_at DESC 
                        LIMIT 5
                    """, (user_id_local,))
                    
                    recent_notifications = cursor.fetchall()
                    
                    # Convertir les dates en strings
                    for notif in recent_notifications:
                        if notif.get('created_at'):
                            notif['created_at'] = notif['created_at'].isoformat()
                    
                    # Envoyer les données
                    data = {
                        'type': 'update',
                        'unread_count': current_count,
                        'recent_notifications': recent_notifications
                    }
                    
                    yield f"data: {json.dumps(data)}\n\n"
                    last_count = current_count
                
                cursor.close()
                conn.close()
                
                # Attendre 5 secondes avant la prochaine vérification
                time.sleep(5)
                
            except GeneratorExit:
                # Le client s'est déconnecté
                logger.info(f"Client déconnecté du stream SSE (user_id: {user_id})")
                break
            except Exception as e:
                logger.error(f"Erreur dans le stream SSE: {str(e)}")
                yield f"data: {json.dumps({'type': 'error', 'message': 'Erreur serveur'})}\n\n"
                time.sleep(5)
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )
