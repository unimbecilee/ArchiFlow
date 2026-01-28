#!/bin/bash

# Script d'initialisation de la base de données pour ESAG GED
# Ce script attend que PostgreSQL soit prêt, puis exécute les migrations Alembic

set -e

echo "🔄 Initialisation de la base de données ESAG GED..."

# Fonction pour attendre que PostgreSQL soit prêt
wait_for_postgres() {
    echo "⏳ Attente de PostgreSQL..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1" > /dev/null 2>&1; then
            echo "✅ PostgreSQL est prêt!"
            return 0
        fi
        
        echo "   Tentative $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Timeout: PostgreSQL n'est pas accessible après $max_attempts tentatives"
    return 1
}

# Attendre que PostgreSQL soit prêt
if ! wait_for_postgres; then
    exit 1
fi

echo ""
echo "📊 Vérification de l'état de la base de données..."

# Vérifier si Alembic est installé
if ! command -v alembic &> /dev/null; then
    echo "❌ Alembic n'est pas installé"
    exit 1
fi

# Vérifier la version actuelle de la base de données
echo "🔍 Version actuelle de la base de données:"
alembic current || echo "   Aucune migration appliquée"

echo ""
echo "🚀 Application des migrations Alembic..."

# Appliquer toutes les migrations
if alembic upgrade head; then
    echo "✅ Migrations appliquées avec succès!"
else
    echo "❌ Erreur lors de l'application des migrations"
    exit 1
fi

echo ""
echo "📋 État final de la base de données:"
alembic current

echo ""
echo "✅ Initialisation de la base de données terminée!"
