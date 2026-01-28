#!/bin/bash

# Script de démarrage rapide pour ESAG GED

set -e

# S'assurer qu'on est à la racine du projet
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 Démarrage ESAG GED..."
echo "📍 Répertoire de travail: $(pwd)"

# Vérifier si main.py existe à la racine
if [ ! -f "main.py" ]; then
    echo "❌ Erreur: main.py non trouvé. Assurez-vous d'être à la racine du projet."
    exit 1
fi

# Vérifier si .env existe
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env non trouvé. Création depuis .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Fichier .env créé. Veuillez le configurer avant de continuer."
        echo "   Éditez .env et configurez au minimum:"
        echo "   - SECRET_KEY"
        echo "   - DATABASE_URL"
        exit 1
    else
        echo "❌ Fichier .env.example non trouvé. Création d'un .env basique..."
        cat > .env << EOF
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgresql://user:password@localhost:5432/esag_ged
CORS_ALLOWED_ORIGINS=http://localhost:3000
FLASK_ENV=development
PORT=5000
EOF
        echo "✅ Fichier .env créé avec valeurs par défaut."
        echo "⚠️  Veuillez le configurer avant de continuer."
        exit 1
    fi
fi

# Vérifier l'environnement virtuel
if [ ! -d "venv" ]; then
    echo "📦 Création de l'environnement virtuel..."
    python3 -m venv venv
fi

# Activer l'environnement virtuel
echo "🔌 Activation de l'environnement virtuel..."
source venv/bin/activate

# Vérifier les dépendances
if ! python -c "import flask" 2>/dev/null; then
    echo "📥 Installation des dépendances Python..."
    pip install --upgrade pip
    pip install -r requirements/dev.txt
    pip install -e .
fi

# Vérifier les dépendances frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "📥 Installation des dépendances frontend..."
    cd frontend
    npm install
    cd ..
fi

# Créer le dossier uploads s'il n'existe pas
mkdir -p AppFlask/uploads

echo ""
echo "✅ Tout est prêt !"
echo ""
echo "📍 Pour démarrer l'application, restez à la racine du projet:"
echo "   $(pwd)"
echo ""
echo "Terminal 1 (Backend):"
echo "   python main.py"
echo ""
echo "Terminal 2 (Frontend):"
echo "   cd frontend && npm start"
echo ""
echo "Ou utilisez: make run (backend seulement)"
echo ""
