from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from AppFlask.services.logging_service import logging_service
from AppFlask.services.maintenance_service import maintenance_service
from AppFlask.api.auth import bp as auth_bp
from AppFlask.api.documents_unified import bp as documents_unified_bp
from AppFlask.api.document_version import bp as document_version_bp
from AppFlask.api.document_comment import bp as document_comment_bp
from AppFlask.api.document_subscription import bp as document_subscription_bp
from AppFlask.api.document_checkout import bp as document_checkout_bp
from AppFlask.api.document_metadata import bp as document_metadata_bp
from AppFlask.api.document_tags import bp as document_tags_bp
from AppFlask.api.document_operations import bp as document_operations_bp
from AppFlask.api.document_processing import bp as document_processing_bp
from AppFlask.api.document_sharing import document_sharing_bp
from AppFlask.api.document_ocr import bp as document_ocr_bp
from AppFlask.api.email import bp as email_bp
from AppFlask.api.notifications import bp as notifications_bp
from AppFlask.api.notifications_sse import bp as notifications_sse_bp
from AppFlask.api.scan import bp as scan_bp
from AppFlask.api.search import bp as search_bp
from AppFlask.api.validation_workflow import bp as validation_workflow_bp
from AppFlask.api.workflow import bp as workflow_bp
from AppFlask.api.trash_unified import bp as trash_unified_bp
from AppFlask.api.history import bp as history_bp
from AppFlask.api.folders import bp as folders_bp
from AppFlask.api.openapi import api_bp as openapi_bp
from AppFlask.api.settings import bp as settings_bp
from AppFlask.api.dashboard import bp as dashboard_bp
import logging
import traceback
import atexit
import os
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from AppFlask.services.email_service import email_service
from AppFlask.services.websocket_service import socketio

# Charger les variables d'environnement depuis un fichier .env si présent
load_dotenv()

# Liste des origines autorisées (configurable via env CORS_ALLOWED_ORIGINS)
_cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:3002,https://esag-ged.vercel.app')
ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]

API_BLUEPRINTS = [
    auth_bp,
    documents_unified_bp,
    document_version_bp,
    document_comment_bp,
    document_subscription_bp,
    document_checkout_bp,
    document_metadata_bp,
    document_tags_bp,
    document_operations_bp,
    document_processing_bp,
    document_sharing_bp,
    document_ocr_bp,
    email_bp,
    notifications_bp,
    notifications_sse_bp,
    scan_bp,
    search_bp,
    validation_workflow_bp,
    workflow_bp,
    dashboard_bp,
    trash_unified_bp,
    history_bp,
    folders_bp,
    openapi_bp,
    settings_bp
]


def create_app():
    app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')

    # Configuration de l'upload
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback_secret_key')

    # Créer le dossier d'upload s'il n'existe pas
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Configuration CORS avec Flask-CORS uniquement
    CORS(
        app,
        resources={r"/*": {"origins": ALLOWED_ORIGINS}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        expose_headers=["Content-Type", "Authorization"]
    )

    # Rate limiting global basique (limites très élevées pour le développement)
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["100000 per day", "10000 per hour"],
        storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
    )

    # Configuration du logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # Enregistrement centralisé des blueprints API
    for blueprint in API_BLUEPRINTS:
        app.register_blueprint(blueprint, url_prefix='/api')

    # Vérifier que les routes de partage sont bien enregistrées
    sharing_routes = [rule.rule for rule in app.url_map.iter_rules() if 'sharing' in rule.rule or 'share' in rule.rule]
    logger.info(f"✅ Système de partage intégré - {len(sharing_routes)} routes disponibles")

    # Initialiser le service email
    email_service.init_app(app)
    logger.info("✅ Service email initialisé")

    # Note: WebSocket temporairement désactivé - problème d'initialisation
    # Les notifications fonctionnent mais nécessitent un rafraîchissement manuel
    # socketio.init_app(app, cors_allowed_origins=ALLOWED_ORIGINS)
    # logger.info("✅ WebSocket initialisé pour notifications temps réel")

    # Démarrage du service de maintenance
    maintenance_service.start_cleanup_scheduler()

    # Enregistrement de l'arrêt du service à la fermeture de l'application
    atexit.register(maintenance_service.stop_cleanup_scheduler)

    # Middleware pour logger toutes les requêtes
    @app.before_request
    def log_request_info():
        # Ne pas logger les requêtes OPTIONS pour éviter le bruit
        if request.method != 'OPTIONS':
            logging_service.log_event(
                level='INFO',
                event_type='HTTP_REQUEST',
                message=f"Requête {request.method} vers {request.path}",
                additional_data={
                    'method': request.method,
                    'path': request.path,
                    'args': dict(request.args),
                    'headers': dict(request.headers),
                },
            )

    # CORS middleware removed - Flask-CORS handles this automatically

    # Gestion globale des erreurs
    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.error(f"Erreur non gérée: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'status': 'error',
            'message': 'Une erreur est survenue',
            'error': str(e)
        }), 500

    # Route de santé pour monitoring et tests
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Endpoint de santé pour vérifier que l'API est opérationnelle"""
        return jsonify({
            'status': 'healthy',
            'message': 'ESAG GED API is running',
            'version': '1.0.0'
        }), 200

    # Route catch-all pour gérer toutes les requêtes OPTIONS non capturées par les blueprints
    @app.route('/api/<path:path>', methods=['OPTIONS'])
    def api_options(path):
        """Gestionnaire pour toutes les requêtes OPTIONS vers /api/"""
        response = jsonify({'message': 'OK'})
        origin = request.headers.get('Origin')
        if origin in ALLOWED_ORIGINS:
            response.headers.add('Access-Control-Allow-Origin', origin)
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(app.static_folder + '/' + path):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')

    return app

