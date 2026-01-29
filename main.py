import os
import logging
from AppFlask import create_app

# Configuration du logging pour Railway
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = create_app()

app.config['UPLOAD_FOLDER'] = "uploads/"

# Note: Les routes de santé sont définies dans app.py
# /api/health - Health check endpoint
# / - Sert le frontend React

if __name__ == '__main__':
    try:
        # Configuration pour le déploiement
        port = int(os.environ.get('PORT', 5000))
        debug = os.environ.get('FLASK_ENV') != 'production'
        
        logger.info(f"Starting ESAG GED on port {port}")
        logger.info(f"Debug mode: {debug}")
        logger.info(f"Environment: {os.environ.get('FLASK_ENV', 'development')}")
        
        # Note: WebSocket temps réel désactivé temporairement
        # Les notifications fonctionnent mais nécessitent un rafraîchissement de page
        app.run(host='0.0.0.0', port=port, debug=debug)
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise
