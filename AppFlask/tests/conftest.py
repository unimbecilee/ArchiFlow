"""
Configuration pytest pour les tests ESAG GED
"""
import pytest
import os
import sys
from unittest.mock import Mock, patch, MagicMock

# Ajouter le répertoire racine au path Python
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

@pytest.fixture
def app():
    """Fixture pour créer une instance de l'application Flask"""
    from AppFlask import create_app
    app = create_app()
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret-key'
    app.config['DATABASE_URL'] = os.getenv('TEST_DATABASE_URL', 'postgresql://test:test@localhost/test_db')
    
    with app.app_context():
        yield app

@pytest.fixture
def client(app):
    """Fixture pour créer un client de test Flask"""
    return app.test_client()

@pytest.fixture
def mock_db_connection():
    """Fixture pour mocker la connexion à la base de données"""
    with patch('AppFlask.db.db_connection') as mock_conn:
        mock_conn_instance = Mock()
        mock_cursor = Mock()
        mock_conn_instance.cursor.return_value = mock_cursor
        mock_conn.return_value = mock_conn_instance
        yield mock_conn_instance, mock_cursor

@pytest.fixture
def mock_user():
    """Fixture pour créer un utilisateur mock"""
    return {
        'id': 1,
        'email': 'test@example.com',
        'nom': 'Test',
        'prenom': 'User',
        'role': 'User'
    }

@pytest.fixture
def mock_admin():
    """Fixture pour créer un administrateur mock"""
    return {
        'id': 1,
        'email': 'admin@example.com',
        'nom': 'Admin',
        'prenom': 'User',
        'role': 'Admin'
    }

@pytest.fixture
def auth_headers(mock_user):
    """Fixture pour créer des headers d'authentification"""
    return {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
    }

@pytest.fixture
def mock_token_required(mock_user):
    """Fixture pour mocker le décorateur token_required"""
    def decorator(f):
        def wrapper(*args, **kwargs):
            return f(mock_user, *args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

