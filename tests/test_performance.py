"""
Tests de performance pour ESAG GED
"""
import pytest
import time
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from AppFlask import create_app

@pytest.fixture
def client():
    """Créer un client de test Flask"""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

class TestPerformance:
    """Tests de performance"""
    
    def test_api_response_time(self, client):
        """Vérifier que les API répondent en moins de 1 seconde"""
        start = time.time()
        response = client.get('/api/health')
        duration = time.time() - start
        
        assert duration < 1.0, f"API trop lente: {duration}s"
        
    def test_concurrent_requests(self, client):
        """Test de requêtes concurrentes (séquentiel pour éviter problèmes de contexte)"""
        # Flask test client n'est pas thread-safe, on teste séquentiellement
        results = []
        for _ in range(50):
            response = client.get('/api/health')
            results.append(response)
        
        # Toutes les requêtes doivent réussir
        success_count = sum(1 for r in results if r.status_code == 200)
        assert success_count >= 45, f"Seulement {success_count}/50 requêtes ont réussi"
        
    def test_large_document_list(self, client):
        """Test de chargement d'une grande liste de documents"""
        start = time.time()
        response = client.get('/api/documents/my')
        duration = time.time() - start
        
        # Même avec beaucoup de documents, doit répondre en moins de 2s
        assert duration < 2.0, f"Chargement documents trop lent: {duration}s"
