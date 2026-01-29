"""
Service WebSocket pour les notifications en temps réel
"""
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
import logging
from functools import wraps
import jwt
import os

logger = logging.getLogger(__name__)

socketio = SocketIO(cors_allowed_origins="*")

# Stockage des utilisateurs connectés
connected_users = {}

def token_required_ws(f):
    """Décorateur pour vérifier le token JWT dans les événements WebSocket"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.args.get('token')
        if not token:
            emit('error', {'message': 'Token manquant'})
            return
        
        try:
            secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
            data = jwt.decode(token, secret_key, algorithms=["HS256"])
            return f(data, *args, **kwargs)
        except jwt.ExpiredSignatureError:
            emit('error', {'message': 'Token expiré'})
        except jwt.InvalidTokenError:
            emit('error', {'message': 'Token invalide'})
    
    return decorated

@socketio.on('connect')
def handle_connect():
    """Gestion de la connexion WebSocket"""
    logger.info(f"Client connecté: {request.sid}")
    emit('connected', {'message': 'Connexion établie'})

@socketio.on('disconnect')
def handle_disconnect():
    """Gestion de la déconnexion WebSocket"""
    logger.info(f"Client déconnecté: {request.sid}")
    # Retirer l'utilisateur de la liste des connectés
    for user_id, sid in list(connected_users.items()):
        if sid == request.sid:
            del connected_users[user_id]
            break

@socketio.on('authenticate')
@token_required_ws
def handle_authenticate(user_data):
    """Authentifier l'utilisateur et l'ajouter à sa room"""
    user_id = user_data.get('id')
    if user_id:
        connected_users[user_id] = request.sid
        join_room(f"user_{user_id}")
        logger.info(f"Utilisateur {user_id} authentifié et ajouté à sa room")
        emit('authenticated', {'user_id': user_id})

@socketio.on('join_document')
@token_required_ws
def handle_join_document(user_data, data):
    """Rejoindre la room d'un document pour les notifications en temps réel"""
    document_id = data.get('document_id')
    if document_id:
        join_room(f"document_{document_id}")
        logger.info(f"Utilisateur {user_data.get('id')} a rejoint document_{document_id}")
        emit('joined_document', {'document_id': document_id})

@socketio.on('leave_document')
@token_required_ws
def handle_leave_document(user_data, data):
    """Quitter la room d'un document"""
    document_id = data.get('document_id')
    if document_id:
        leave_room(f"document_{document_id}")
        logger.info(f"Utilisateur {user_data.get('id')} a quitté document_{document_id}")
        emit('left_document', {'document_id': document_id})

def notify_user(user_id, notification_type, data):
    """Envoyer une notification à un utilisateur spécifique"""
    try:
        socketio.emit('notification', {
            'type': notification_type,
            'data': data
        }, room=f"user_{user_id}")
        logger.info(f"Notification envoyée à l'utilisateur {user_id}: {notification_type}")
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de notification WebSocket: {e}")

def notify_document_watchers(document_id, event_type, data):
    """Notifier tous les utilisateurs qui regardent un document"""
    try:
        socketio.emit('document_event', {
            'type': event_type,
            'data': data
        }, room=f"document_{document_id}")
        logger.info(f"Événement document envoyé pour document {document_id}: {event_type}")
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi d'événement document: {e}")

def broadcast_notification(notification_type, data):
    """Diffuser une notification à tous les utilisateurs connectés"""
    try:
        socketio.emit('broadcast', {
            'type': notification_type,
            'data': data
        })
        logger.info(f"Notification broadcast envoyée: {notification_type}")
    except Exception as e:
        logger.error(f"Erreur lors du broadcast: {e}")
