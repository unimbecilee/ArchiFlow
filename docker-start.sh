#!/bin/bash

# Script de démarrage Docker pour ESAG GED
# Démarre PostgreSQL et MinIO avec Docker Compose

set -e

echo "🚀 Démarrage de l'infrastructure Docker ESAG GED..."
echo ""

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env depuis .env.docker..."
    cp .env.docker .env
    echo "✅ Fichier .env créé"
else
    echo "✅ Fichier .env existe déjà"
fi

# Démarrer les services Docker
echo ""
echo "🐳 Démarrage des conteneurs Docker..."
docker-compose up -d

# Attendre que PostgreSQL soit prêt
echo ""
echo "⏳ Attente de PostgreSQL..."
sleep 5

# Vérifier l'état des services
echo ""
echo "📊 État des services:"
docker-compose ps

echo ""
echo "✅ Infrastructure Docker démarrée avec succès!"
echo ""
echo "📍 Services disponibles:"
echo "   - PostgreSQL:     localhost:5434"
echo "   - MinIO API:      http://localhost:9000"
echo "   - MinIO Console:  http://localhost:9001"
echo "   - PgAdmin:        http://localhost:5050"
echo ""
echo "🔐 Identifiants par défaut:"
echo "   MinIO Console:    minioadmin / minioadmin123"
echo "   PgAdmin:          admin@esag.com / admin123"
echo ""
echo "💡 Commandes utiles:"
echo "   - Arrêter:        docker-compose down"
echo "   - Logs:           docker-compose logs -f"
echo "   - Redémarrer:     docker-compose restart"
echo ""
