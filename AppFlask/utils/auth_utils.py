import jwt
from flask import request, jsonify, current_app
from functools import wraps
import os

def token_required(f):
    """Décorateur pour vérifier le token JWT dans les requêtes API"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                # Format: "Bearer <token>"
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Format du token invalide'}), 401
        
        if not token:
            return jsonify({'error': 'Token manquant'}), 401

        try:
            # Décoder le token
            secret_key = current_app.config.get('SECRET_KEY') or os.getenv('SECRET_KEY', 'fallback_secret_key')
            data = jwt.decode(token, secret_key, algorithms=['HS256'])
            current_user_data = {
                'user_id': data['user_id'],
                'email': data['email'],
                'role': data.get('role', 'user')
            }
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expiré'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token invalide'}), 401

        return f(current_user_data, *args, **kwargs)
    
    return decorated

def role_required(*roles):
    """Décorateur pour restreindre l'accès selon le rôle extrait du JWT"""
    def wrapper(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            role = (current_user or {}).get('role', '').lower()
            allowed = {r.lower() for r in roles}
            if role not in allowed:
                return jsonify({'message': 'Accès non autorisé'}), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return wrapper

def require_json_fields(required_fields):
    """Décorateur pour valider la présence de champs JSON requis"""
    def wrapper(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            data = request.get_json(silent=True) or {}
            missing = [field for field in required_fields if not data.get(field)]
            if missing:
                return jsonify({'message': f"Champs obligatoires manquants: {', '.join(missing)}"}), 400
            return f(*args, **kwargs)
        return decorated
    return wrapper
 