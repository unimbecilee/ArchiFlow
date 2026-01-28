.PHONY: help install install-dev test lint format clean run build docker-up docker-down docker-logs docker-clean

help:
	@echo "ESAG GED - Makefile"
	@echo ""
	@echo "Commandes disponibles:"
	@echo "  make install      - Installer les dépendances de production"
	@echo "  make install-dev  - Installer les dépendances de développement"
	@echo "  make test         - Lancer les tests"
	@echo "  make lint         - Vérifier le code avec flake8"
	@echo "  make format       - Formater le code avec black"
	@echo "  make clean        - Nettoyer les fichiers temporaires"
	@echo "  make run          - Lancer l'application"
	@echo "  make build        - Construire le frontend"
	@echo ""
	@echo "Commandes Docker:"
	@echo "  make docker-up    - Démarrer PostgreSQL et MinIO"
	@echo "  make docker-down  - Arrêter les services Docker"
	@echo "  make docker-logs  - Voir les logs Docker"
	@echo "  make docker-clean - Nettoyer les volumes Docker"

install:
	pip install -r requirements.txt
	pip install -e .

install-dev:
	pip install -r requirements/dev.txt
	pip install -e .

test:
	pytest AppFlask/tests/ -v --cov=AppFlask --cov-report=html

lint:
	flake8 AppFlask/ --max-line-length=100 --exclude=__pycache__,migrations
	cd frontend && npm run lint || true

format:
	black AppFlask/ --line-length=100
	cd frontend && npm run format || true

clean:
	find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.log" -delete
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf htmlcov/
	rm -rf dist/
	rm -rf build/
	rm -rf *.egg-info/

run:
	python main.py

build:
	cd frontend && npm install && npm run build

docker-up:
	@echo "🐳 Démarrage de l'infrastructure Docker..."
	docker-compose up -d
	@echo "✅ Services démarrés"
	@echo "   - PostgreSQL: localhost:5434"
	@echo "   - MinIO API: http://localhost:9000"
	@echo "   - MinIO Console: http://localhost:9001"
	@echo "   - PgAdmin: http://localhost:5050"

docker-down:
	@echo "🛑 Arrêt des services Docker..."
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-clean:
	@echo "⚠️  Suppression des volumes Docker (perte de données)..."
	docker-compose down -v
	@echo "✅ Volumes supprimés"

