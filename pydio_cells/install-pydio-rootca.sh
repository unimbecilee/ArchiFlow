#!/bin/bash
# Script d'installation du certificat RootCA Pydio Cells
# Compatible : Linux (Fedora, RHEL, CentOS, Debian, Ubuntu), macOS
# Usage: ./install-pydio-rootca.sh [container-name]

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="${1:-unidoc_cells_app}"
CERT_SOURCE_PATH="/var/cells/certs/rootCA.pem"
TEMP_CERT_DIR="/tmp/pydio-certs"
TEMP_CERT_FILE="${TEMP_CERT_DIR}/rootCA.pem"

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Détecter l'OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/redhat-release ]; then
            # Fedora, RHEL, CentOS
            if grep -q "Fedora" /etc/redhat-release; then
                echo "fedora"
            elif grep -q "Red Hat" /etc/redhat-release; then
                echo "rhel"
            elif grep -q "CentOS" /etc/redhat-release; then
                echo "centos"
            else
                echo "rhel"  # Par défaut RHEL
            fi
        elif [ -f /etc/debian_version ]; then
            # Debian, Ubuntu
            if [ -f /etc/lsb-release ]; then
                . /etc/lsb-release
                if [[ "$DISTRIB_ID" == "Ubuntu" ]]; then
                    echo "ubuntu"
                else
                    echo "debian"
                fi
            else
                echo "debian"
            fi
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

# Vérifier que Docker est disponible
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé ou n'est pas dans le PATH"
        exit 1
    fi
    
    if ! docker ps &> /dev/null; then
        log_error "Impossible de se connecter à Docker. Vérifiez que Docker est démarré et que vous avez les permissions."
        exit 1
    fi
}

# Vérifier que le conteneur existe
check_container() {
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "Le conteneur '${CONTAINER_NAME}' n'existe pas"
        log_info "Conteneurs disponibles :"
        docker ps -a --format '{{.Names}}'
        exit 1
    fi
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_warning "Le conteneur '${CONTAINER_NAME}' n'est pas en cours d'exécution"
        log_info "Démarrage du conteneur..."
        docker start "${CONTAINER_NAME}" || {
            log_error "Impossible de démarrer le conteneur"
            exit 1
        }
        sleep 2
    fi
}

# Extraire le certificat depuis le conteneur
extract_certificate() {
    log_info "Extraction du certificat RootCA depuis le conteneur '${CONTAINER_NAME}'..."
    
    # Créer le répertoire temporaire
    mkdir -p "${TEMP_CERT_DIR}"
    
    # Vérifier que le certificat existe dans le conteneur
    if ! docker exec "${CONTAINER_NAME}" test -f "${CERT_SOURCE_PATH}"; then
        log_error "Le certificat RootCA n'existe pas dans le conteneur à ${CERT_SOURCE_PATH}"
        log_info "Vérifiez que Pydio Cells est configuré avec TLS activé"
        log_info "Vous pouvez vérifier avec: docker exec ${CONTAINER_NAME} ls -la /var/cells/certs/"
        exit 1
    fi
    
    # Copier le certificat depuis le conteneur
    if docker cp "${CONTAINER_NAME}:${CERT_SOURCE_PATH}" "${TEMP_CERT_FILE}"; then
        log_success "Certificat extrait avec succès vers ${TEMP_CERT_FILE}"
    else
        log_error "Échec de l'extraction du certificat"
        exit 1
    fi
    
    # Vérifier que le fichier est valide
    if ! openssl x509 -in "${TEMP_CERT_FILE}" -text -noout &> /dev/null; then
        log_error "Le fichier extrait n'est pas un certificat X.509 valide"
        exit 1
    fi
    
    log_success "Certificat valide"
}

# Installer sur Fedora/RHEL/CentOS
install_fedora() {
    log_info "Installation sur Fedora/RHEL/CentOS..."
    
    local cert_dest="/etc/pki/ca-trust/source/anchors/pydio-rootCA.pem"
    
    if [ "$EUID" -ne 0 ]; then
        log_error "Cette opération nécessite les privilèges root (sudo)"
        log_info "Exécutez: sudo $0 $@"
        exit 1
    fi
    
    cp "${TEMP_CERT_FILE}" "${cert_dest}"
    chmod 644 "${cert_dest}"
    
    update-ca-trust
    
    log_success "Certificat installé dans ${cert_dest}"
    log_info "Le certificat a été ajouté au store de confiance système"
}

# Installer sur Debian/Ubuntu
install_debian() {
    log_info "Installation sur Debian/Ubuntu..."
    
    local cert_dest="/usr/local/share/ca-certificates/pydio-rootCA.crt"
    
    if [ "$EUID" -ne 0 ]; then
        log_error "Cette opération nécessite les privilèges root (sudo)"
        log_info "Exécutez: sudo $0 $@"
        exit 1
    fi
    
    cp "${TEMP_CERT_FILE}" "${cert_dest}"
    chmod 644 "${cert_dest}"
    
    update-ca-certificates
    
    log_success "Certificat installé dans ${cert_dest}"
    log_info "Le certificat a été ajouté au store de confiance système"
}

# Installer sur macOS
install_macos() {
    log_info "Installation sur macOS..."
    
    local keychain="/Library/Keychains/System.keychain"
    
    if [ "$EUID" -ne 0 ]; then
        log_error "Cette opération nécessite les privilèges root (sudo)"
        log_info "Exécutez: sudo $0 $@"
        exit 1
    fi
    
    # Vérifier que security est disponible
    if ! command -v security &> /dev/null; then
        log_error "La commande 'security' n'est pas disponible"
        exit 1
    fi
    
    security add-trusted-cert -d -r trustRoot -k "${keychain}" "${TEMP_CERT_FILE}"
    
    log_success "Certificat installé dans le keychain système"
    log_info "Le certificat a été ajouté comme autorité de confiance racine"
}

# Installer sur Linux générique
install_linux_generic() {
    log_warning "Distribution Linux non reconnue, tentative d'installation générique..."
    
    # Essayer Fedora/RHEL d'abord
    if command -v update-ca-trust &> /dev/null; then
        install_fedora
    # Essayer Debian/Ubuntu
    elif command -v update-ca-certificates &> /dev/null; then
        install_debian
    else
        log_error "Aucune méthode d'installation automatique disponible pour cette distribution"
        log_info "Copiez manuellement ${TEMP_CERT_FILE} dans le store de certificats de votre système"
        exit 1
    fi
}

# Fonction principale d'installation
install_certificate() {
    local os=$(detect_os)
    
    log_info "OS détecté: ${os}"
    
    case "${os}" in
        fedora|rhel|centos)
            install_fedora
            ;;
        debian|ubuntu)
            install_debian
            ;;
        macos)
            install_macos
            ;;
        linux)
            install_linux_generic
            ;;
        *)
            log_error "OS non supporté: ${os}"
            log_info "OS détecté: ${OSTYPE}"
            log_info "Veuillez installer manuellement le certificat depuis: ${TEMP_CERT_FILE}"
            exit 1
            ;;
    esac
}

# Nettoyer les fichiers temporaires
cleanup() {
    if [ -d "${TEMP_CERT_DIR}" ]; then
        log_info "Nettoyage des fichiers temporaires..."
        rm -rf "${TEMP_CERT_DIR}"
    fi
}

# Afficher les instructions pour Windows
show_windows_instructions() {
    log_info "Instructions pour Windows:"
    echo ""
    echo "1. Copiez le fichier ${TEMP_CERT_FILE} sur votre machine Windows"
    echo "2. Double-cliquez sur le fichier rootCA.pem"
    echo "3. Cliquez sur 'Installer le certificat'"
    echo "4. Sélectionnez 'Magasin de certificats' → 'Autorités de certification racines de confiance'"
    echo "5. Cliquez sur 'Suivant' puis 'Terminer'"
    echo "6. Redémarrez votre navigateur"
    echo ""
    echo "Ou utilisez le script PowerShell: install-pydio-rootca.ps1"
}

# Fonction principale
main() {
    echo "=========================================="
    echo "  Installation RootCA Pydio Cells"
    echo "=========================================="
    echo ""
    
    # Vérifications préalables
    check_docker
    check_container
    
    # Extraire le certificat
    extract_certificate
    
    # Installer selon l'OS
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        show_windows_instructions
    else
        install_certificate
        cleanup
    fi
    
    echo ""
    log_success "Installation terminée !"
    log_info "Redémarrez votre navigateur pour que les changements prennent effet"
    echo ""
}

# Gérer les signaux pour le nettoyage
trap cleanup EXIT

# Exécuter le script principal
main "$@"

