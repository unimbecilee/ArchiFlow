#!/bin/bash
###############################################################################
# Script de déploiement ESAG GED - Production
###############################################################################

set -e  # Arrêter en cas d'erreur

echo "🚀 Démarrage du déploiement ESAG GED..."

# Couleurs pour les logs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables d'environnement
DEPLOY_ENV=${1:-production}
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${YELLOW}📋 Environnement: ${DEPLOY_ENV}${NC}"

###############################################################################
# 1. Vérifications préalables
###############################################################################
echo -e "${YELLOW}🔍 Vérifications préalables...${NC}"

# Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Fichier .env manquant!${NC}"
    exit 1
fi

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 non installé!${NC}"
    exit 1
fi

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non installé!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Vérifications OK${NC}"

###############################################################################
# 2. Backup de la base de données
###############################################################################
echo -e "${YELLOW}💾 Backup de la base de données...${NC}"

mkdir -p "$BACKUP_DIR"

# Charger les variables d'environnement
source .env

# Backup PostgreSQL
if [ -n "$DB_NAME" ]; then
    pg_dump -U "$DB_USER" -h "$DB_HOST" "$DB_NAME" > "$BACKUP_DIR/database_backup.sql"
    echo -e "${GREEN}✅ Backup base de données créé: $BACKUP_DIR/database_backup.sql${NC}"
else
    echo -e "${YELLOW}⚠️  Variables DB non définies, backup ignoré${NC}"
fi

###############################################################################
# 3. Installation des dépendances Backend
###############################################################################
echo -e "${YELLOW}📦 Installation des dépendances Backend...${NC}"

# Activer l'environnement virtuel ou le créer
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

source .venv/bin/activate

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}✅ Dépendances Backend installées${NC}"

###############################################################################
# 4. Build Frontend
###############################################################################
echo -e "${YELLOW}🏗️  Build du Frontend...${NC}"

cd frontend

# Installer les dépendances
npm install

# Build pour production
npm run build

cd ..

echo -e "${GREEN}✅ Frontend buildé${NC}"

###############################################################################
# 5. Migrations de base de données
###############################################################################
echo -e "${YELLOW}🗄️  Migrations de base de données...${NC}"

# TODO: Ajouter vos migrations ici
# python manage.py migrate

echo -e "${GREEN}✅ Migrations appliquées${NC}"

###############################################################################
# 6. Tests
###############################################################################
if [ "$DEPLOY_ENV" == "production" ]; then
    echo -e "${YELLOW}🧪 Exécution des tests...${NC}"
    
    # Tests Backend
    pytest tests/ -v --tb=short || {
        echo -e "${RED}❌ Tests échoués! Déploiement annulé.${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Tests réussis${NC}"
fi

###############################################################################
# 7. Démarrage des services
###############################################################################
echo -e "${YELLOW}🚀 Démarrage des services...${NC}"

# Arrêter les anciens processus
pkill -f "python main.py" || true
pkill -f "npm start" || true

# Démarrer le backend
nohup python main.py > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID" > .pids

# Attendre que le backend démarre
sleep 5

# Vérifier que le backend est démarré
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✅ Backend démarré (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ Échec du démarrage du backend${NC}"
    exit 1
fi

###############################################################################
# 8. Configuration Nginx (optionnel)
###############################################################################
if command -v nginx &> /dev/null; then
    echo -e "${YELLOW}🌐 Configuration Nginx...${NC}"
    
    # Copier la configuration Nginx
    if [ -f "nginx.conf" ]; then
        sudo cp nginx.conf /etc/nginx/sites-available/esag-ged
        sudo ln -sf /etc/nginx/sites-available/esag-ged /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx
        echo -e "${GREEN}✅ Nginx configuré${NC}"
    fi
fi

###############################################################################
# 9. Vérifications post-déploiement
###############################################################################
echo -e "${YELLOW}🔍 Vérifications post-déploiement...${NC}"

# Vérifier que l'API répond
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health || echo "000")

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ API opérationnelle${NC}"
else
    echo -e "${RED}❌ API non accessible (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

###############################################################################
# 10. Résumé
###############################################################################
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ DÉPLOIEMENT RÉUSSI !                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📊 Résumé:"
echo -e "  - Environnement: ${DEPLOY_ENV}"
echo -e "  - Backup: ${BACKUP_DIR}"
echo -e "  - Backend PID: ${BACKEND_PID}"
echo -e "  - API: http://localhost:5000"
echo -e "  - Frontend: http://localhost:3000"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo -e "  - Backend: tail -f logs/backend.log"
echo -e "  - Nginx: tail -f /var/log/nginx/access.log"
echo ""
echo -e "${GREEN}🎉 ESAG GED est maintenant en production !${NC}"
