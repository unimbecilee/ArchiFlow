#!/bin/bash
# Script de configuration automatique pour Pydio Cells
# Utilise un fichier .env pour la configuration

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration par défaut
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"
INSTALL_YAML="${INSTALL_YAML:-$SCRIPT_DIR/install-conf.yml}"
CELLS_BINARY="${CELLS_BINARY:-cells}"

# Fonction d'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Configure Pydio Cells automatiquement depuis un fichier .env"
    echo ""
    echo "Options:"
    echo "  -e, --env-file FILE    Fichier .env à utiliser (défaut: .env dans le même dossier)"
    echo "  -y, --yaml-file FILE   Fichier YAML de sortie (défaut: install-conf.yml)"
    echo "  -c, --cells-binary     Chemin vers le binaire cells (défaut: cells)"
    echo "  -h, --help             Afficher cette aide"
    echo ""
    echo "Variables d'environnement supportées dans le .env:"
    echo "  DB_HOST                Hôte MySQL (défaut: unidoc_cells_db)"
    echo "  DB_PORT                Port MySQL (défaut: 3306)"
    echo "  DB_NAME                Nom de la base (défaut: unidoc_cells)"
    echo "  DB_USER                Utilisateur MySQL (défaut: pydio)"
    echo "  DB_PASSWORD            Mot de passe MySQL (défaut: P@ssw0rd)"
    echo "  FRONTEND_LOGIN         Login admin (défaut: superadmin)"
    echo "  FRONTEND_PASSWORD       Mot de passe admin (défaut: superadmin)"
    echo ""
}

# Parser les arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        -y|--yaml-file)
            INSTALL_YAML="$2"
            shift 2
            ;;
        -c|--cells-binary)
            CELLS_BINARY="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Option inconnue: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Vérifier que le fichier .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Fichier .env introuvable: $ENV_FILE${NC}"
    echo "   Créez un fichier .env avec les variables de configuration."
    exit 1
fi

echo -e "${BLUE}📄 Chargement des variables depuis $ENV_FILE...${NC}"
# Charger les variables depuis le fichier .env
set -a
source "$ENV_FILE"
set +a

# Variables avec valeurs par défaut
# Détecter si on est dans Docker
if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
    # Dans Docker : utiliser le nom du service Docker
    DB_HOST="${DB_HOST:-unidoc_cells_db}"
    DB_PORT="${DB_PORT:-3306}"  # Port interne Docker (pas le port mappé)
else
    # Sur l'hôte : utiliser localhost avec le port mappé
    DB_HOST="${DB_HOST:-127.0.0.1}"
    DB_PORT="${DB_PORT:-3303}"  # Port mappé sur l'hôte
fi

DB_NAME="${DB_NAME:-unidoc_cells}"
DB_USER="${DB_USER:-pydio}"
DB_PASSWORD="${DB_PASSWORD:-P@ssw0rd}"
FRONTEND_LOGIN="${FRONTEND_LOGIN:-superadmin}"
FRONTEND_PASSWORD="${FRONTEND_PASSWORD:-superadmin}"

echo -e "${GREEN}✅ Variables chargées:${NC}"
echo "   DB_HOST: $DB_HOST"
echo "   DB_PORT: $DB_PORT"
echo "   DB_NAME: $DB_NAME"
echo "   DB_USER: $DB_USER"
echo "   FRONTEND_LOGIN: $FRONTEND_LOGIN"

# Vérifier si mysql client est disponible pour tester la connexion
if command -v mysql &> /dev/null; then
    echo -e "${BLUE}⏳ Vérification de la connexion à MySQL ($DB_HOST:$DB_PORT)...${NC}"
    
    # Attendre que MySQL soit prêt (augmenter le délai)
    MAX_RETRIES=30  # Au lieu de 05
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        # Tester la connexion avec timeout et meilleure gestion d'erreur
        if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
           --connect-timeout=5 \
           -e "SELECT 1" "$DB_NAME" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Connexion à MySQL réussie!${NC}"
            break
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                echo "   Tentative $RETRY_COUNT/$MAX_RETRIES..."
                sleep 2
            else
                echo -e "${YELLOW}⚠️  Impossible de se connecter à MySQL après $MAX_RETRIES tentatives${NC}"
                echo "   Le script continuera, mais la configuration pourrait échouer."
            fi
        fi
    done
else
    echo -e "${YELLOW}⚠️  Client MySQL non disponible, impossible de vérifier la connexion${NC}"
fi

# Créer le fichier de configuration YAML
echo -e "${BLUE}📝 Création du fichier de configuration: $INSTALL_YAML...${NC}"
cat > "$INSTALL_YAML" <<EOF
# Configuration automatique de Pydio Cells
# Générée automatiquement depuis le fichier .env
# Date: $(date)

# Configuration proxy (HTTP seulement pour éviter les problèmes de certificat SSL)
proxyconfigs:
  - binds:
      - 0.0.0.0:8080
    reverseproxyurl: http://localhost:8080

# Connexion à la base de données
dbconnectiontype: tcp
dbtcphostname: ${DB_HOST}
dbtcpport: ${DB_PORT}
dbtcpname: ${DB_NAME}
dbtcpuser: ${DB_USER}
dbtcppassword: ${DB_PASSWORD}

# Utilisateur administrateur
frontendlogin: ${FRONTEND_LOGIN}
frontendpassword: ${FRONTEND_PASSWORD}
EOF

echo -e "${GREEN}✅ Fichier de configuration créé: $INSTALL_YAML${NC}"

# Vérifier si Cells est déjà configuré
CELLS_CONFIG_DIR="${CELLS_WORKING_DIR:-$HOME/.config/pydio/cells}"
if [ -d "$CELLS_CONFIG_DIR/pydio" ] && [ -f "$CELLS_CONFIG_DIR/pydio/cells.db" ]; then
    echo -e "${YELLOW}⚠️  Cells semble déjà être configuré dans $CELLS_CONFIG_DIR${NC}"
    echo "   Pour reconfigurer, supprimez le dossier de configuration ou utilisez:"
    echo "   $CELLS_BINARY configure --yaml $INSTALL_YAML"
    exit 0
fi

# Lancer la configuration de Cells
echo -e "${BLUE}🚀 Lancement de la configuration de Cells...${NC}"
echo "   Utilisation du fichier: $INSTALL_YAML"

# Exporter la variable d'environnement pour Cells
export CELLS_INSTALL_YAML="$INSTALL_YAML"

# Chercher le binaire Cells
if command -v "$CELLS_BINARY" &> /dev/null; then
    # Binaire trouvé dans le PATH
    CELLS_BINARY_FOUND="$CELLS_BINARY"
elif [ -f "$SCRIPT_DIR/$CELLS_BINARY" ]; then
    # Binaire trouvé dans le répertoire du script
    CELLS_BINARY_FOUND="$SCRIPT_DIR/$CELLS_BINARY"
elif [ -f "./$CELLS_BINARY" ]; then
    # Binaire trouvé dans le répertoire courant
    CELLS_BINARY_FOUND="./$CELLS_BINARY"
else
    CELLS_BINARY_FOUND=""
fi

# Lancer automatiquement la configuration
if [ -n "$CELLS_BINARY_FOUND" ]; then
    echo -e "${GREEN}✅ Binaire Cells trouvé: $CELLS_BINARY_FOUND${NC}"
    echo ""
    echo -e "${BLUE}⚙️  Lancement de la configuration de Cells...${NC}"
    if "$CELLS_BINARY_FOUND" configure --yaml "$INSTALL_YAML"; then
        echo -e "${GREEN}✅ Configuration de Cells terminée avec succès!${NC}"
        echo ""
        
        # Exporter la variable d'environnement dans le script actuel
        export CELLS_INSTALL_YAML="$INSTALL_YAML"
        echo -e "${BLUE}📤 Variable CELLS_INSTALL_YAML exportée pour cette session${NC}"
        
        # Ajouter l'export au .bashrc si ce n'est pas déjà fait
        BASHRC_FILE="$HOME/.bashrc"
        EXPORT_LINE="export CELLS_INSTALL_YAML=\"$INSTALL_YAML\""
        
        if [ -f "$BASHRC_FILE" ]; then
            if grep -q "CELLS_INSTALL_YAML" "$BASHRC_FILE"; then
                echo -e "${YELLOW}⚠️  La variable CELLS_INSTALL_YAML existe déjà dans $BASHRC_FILE${NC}"
                echo "   Mise à jour de la ligne existante..."
                # Remplacer la ligne existante
                sed -i "s|export CELLS_INSTALL_YAML=.*|$EXPORT_LINE|" "$BASHRC_FILE"
                echo -e "${GREEN}✅ Variable mise à jour dans $BASHRC_FILE${NC}"
            else
                echo -e "${BLUE}📝 Ajout de la variable au fichier $BASHRC_FILE...${NC}"
                echo "" >> "$BASHRC_FILE"
                echo "# Pydio Cells configuration" >> "$BASHRC_FILE"
                echo "$EXPORT_LINE" >> "$BASHRC_FILE"
                echo -e "${GREEN}✅ Variable ajoutée à $BASHRC_FILE${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Fichier $BASHRC_FILE non trouvé, création...${NC}"
            echo "$EXPORT_LINE" > "$BASHRC_FILE"
            echo -e "${GREEN}✅ Fichier $BASHRC_FILE créé avec la variable${NC}"
        fi
        
        # Recharger le .bashrc pour appliquer les changements
        echo -e "${BLUE}🔄 Rechargement du fichier $BASHRC_FILE...${NC}"
        source "$BASHRC_FILE"
        echo -e "${GREEN}✅ Variables d'environnement rechargées${NC}"
        
        echo ""
        echo -e "${GREEN}📋 Pour démarrer Cells, exécutez:${NC}"
        echo "  $CELLS_BINARY_FOUND start"
        echo ""
    else
        echo -e "${RED}❌ Erreur lors de la configuration de Cells${NC}"
        echo "   Vérifiez les logs ci-dessus pour plus de détails."
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Binaire Cells non trouvé: $CELLS_BINARY${NC}"
    echo "   Le fichier de configuration a été créé avec succès."
    echo "   Utilisez-le manuellement avec:"
    echo "   export CELLS_INSTALL_YAML=\"$INSTALL_YAML\""
    echo "   cells configure --yaml \"$INSTALL_YAML\""
fi

echo -e "${GREEN}✅ Configuration terminée!${NC}"
