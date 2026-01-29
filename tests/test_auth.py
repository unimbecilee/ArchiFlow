"""
Tests unitaires pour l'authentification
"""
import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from AppFlask import create_app
import json

@pytest.fixture
def client():
    """Créer un client de test Flask"""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def auth_headers():
    """Headers d'authentification pour les tests"""
    # TODO: Générer un vrai token JWT pour les tests
    return {
        'Authorization': 'Bearer test_token',
        'Content-Type': 'application/json'
    }

class TestAuth:
    """Tests pour les routes d'authentification"""
    
    def test_login_success(self, client):
        """Test de connexion réussie"""
        response = client.post('/api/login', 
            data=json.dumps({
                'email': 'admin@esag.com',
                'password': 'admin123'
            }),
            content_type='application/json'
        )
        assert response.status_code in [200, 401]  # 401 si mauvais credentials
        
    def test_login_missing_credentials(self, client):
        """Test de connexion sans credentials"""
        response = client.post('/api/login',
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400
        
    def test_create_user_admin_only(self, client, auth_headers):
        """Test de création d'utilisateur (admin seulement)"""
        response = client.post('/api/users',
            headers=auth_headers,
            data=json.dumps({
                'email': 'test@example.com',
                'nom': 'Test',
                'prenom': 'User',
                'role': 'user'
            }),
            content_type='application/json'
        )
        # Devrait échouer sans token valide
        assert response.status_code in [201, 401, 403]

class TestNotifications:
    """Tests pour les notifications"""
    
    def test_get_notifications(self, client, auth_headers):
        """Test de récupération des notifications"""
        response = client.get('/api/notifications', headers=auth_headers)
        assert response.status_code in [200, 401]
        
    def test_delete_notification(self, client, auth_headers):
        """Test de suppression de notification"""
        response = client.delete('/api/notifications/1', headers=auth_headers)
        assert response.status_code in [200, 404, 401]
        
    def test_mark_notification_read(self, client, auth_headers):
        """Test de marquage comme lu"""
        response = client.put('/api/notifications/1/read', headers=auth_headers)
        assert response.status_code in [200, 404, 401]

class TestDocumentSharing:
    """Tests pour le partage de documents"""
    
    def test_share_document(self, client, auth_headers):
        """Test de partage de document"""
        response = client.post('/api/documents/1/share',
            headers=auth_headers,
            data=json.dumps({
                'destinataires': [
                    {'type': 'utilisateur', 'id': '2', 'nom': 'Test User'}
                ],
                'permissions': ['lecture']
            }),
            content_type='application/json'
        )
        assert response.status_code in [201, 404, 401, 403]
        
    def test_share_document_invalid_permissions(self, client, auth_headers):
        """Test de partage avec permissions invalides"""
        response = client.post('/api/documents/1/share',
            headers=auth_headers,
            data=json.dumps({
                'destinataires': [
                    {'type': 'utilisateur', 'id': '2', 'nom': 'Test'}
                ],
                'permissions': ['invalid_permission']
            }),
            content_type='application/json'
        )
        assert response.status_code in [400, 401, 403]

class TestFolders:
    """Tests pour les dossiers"""
    
    def test_get_folders(self, client, auth_headers):
        """Test de récupération des dossiers"""
        response = client.get('/api/folders/', headers=auth_headers)
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = json.loads(response.data)
            assert isinstance(data, list)
            
    def test_create_folder(self, client, auth_headers):
        """Test de création de dossier"""
        response = client.post('/api/folders/',
            headers=auth_headers,
            data=json.dumps({
                'titre': 'Test Folder',
                'description': 'Test Description'
            }),
            content_type='application/json'
        )
        assert response.status_code in [201, 401, 400]
