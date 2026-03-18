# Script d'installation du certificat RootCA Pydio Cells pour Windows
# Usage: .\install-pydio-rootca.ps1 [container-name]

param(
    [string]$ContainerName = "unidoc_cells_app"
)

$ErrorActionPreference = "Stop"

# Couleurs pour les messages
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Vérifier que Docker est disponible
function Test-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker n'est pas installé ou n'est pas dans le PATH"
        exit 1
    }
    
    try {
        docker ps | Out-Null
    } catch {
        Write-Error "Impossible de se connecter à Docker. Vérifiez que Docker Desktop est démarré."
        exit 1
    }
}

# Vérifier que le conteneur existe
function Test-Container {
    $containers = docker ps -a --format '{{.Names}}'
    if ($containers -notcontains $ContainerName) {
        Write-Error "Le conteneur '$ContainerName' n'existe pas"
        Write-Info "Conteneurs disponibles :"
        docker ps -a --format '{{.Names}}'
        exit 1
    }
    
    $running = docker ps --format '{{.Names}}'
    if ($running -notcontains $ContainerName) {
        Write-Warning "Le conteneur '$ContainerName' n'est pas en cours d'exécution"
        Write-Info "Démarrage du conteneur..."
        docker start $ContainerName
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Impossible de démarrer le conteneur"
            exit 1
        }
        Start-Sleep -Seconds 2
    }
}

# Extraire le certificat depuis le conteneur
function Get-Certificate {
    $certSourcePath = "/var/cells/certs/rootCA.pem"
    $tempCertDir = "$env:TEMP\pydio-certs"
    $tempCertFile = "$tempCertDir\rootCA.pem"
    
    Write-Info "Extraction du certificat RootCA depuis le conteneur '$ContainerName'..."
    
    # Créer le répertoire temporaire
    New-Item -ItemType Directory -Force -Path $tempCertDir | Out-Null
    
    # Vérifier que le certificat existe dans le conteneur
    $certExists = docker exec $ContainerName test -f $certSourcePath
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Le certificat RootCA n'existe pas dans le conteneur à $certSourcePath"
        Write-Info "Vérifiez que Pydio Cells est configuré avec TLS activé"
        Write-Info "Vous pouvez vérifier avec: docker exec $ContainerName ls -la /var/cells/certs/"
        exit 1
    }
    
    # Copier le certificat depuis le conteneur
    docker cp "${ContainerName}:${certSourcePath}" $tempCertFile
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Échec de l'extraction du certificat"
        exit 1
    }
    
    Write-Success "Certificat extrait avec succès vers $tempCertFile"
    return $tempCertFile
}

# Installer le certificat sur Windows
function Install-Certificate {
    param([string]$CertFile)
    
    Write-Info "Installation du certificat sur Windows..."
    
    # Vérifier les privilèges administrateur
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Error "Cette opération nécessite les privilèges administrateur"
        Write-Info "Relancez PowerShell en tant qu'administrateur"
        exit 1
    }
    
    try {
        # Importer le certificat dans le store LocalMachine\Root (Autorités de certification racines)
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertFile)
        $store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreName]::Root, [System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine)
        $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
        $store.Add($cert)
        $store.Close()
        
        Write-Success "Certificat installé dans le magasin 'Autorités de certification racines de confiance'"
        Write-Info "Le certificat a été ajouté au store système"
    } catch {
        Write-Error "Échec de l'installation du certificat: $_"
        Write-Info "Vous pouvez installer manuellement en double-cliquant sur: $CertFile"
        exit 1
    }
}

# Fonction principale
function Main {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  Installation RootCA Pydio Cells" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Vérifications préalables
    Test-Docker
    Test-Container
    
    # Extraire le certificat
    $certFile = Get-Certificate
    
    # Installer le certificat
    Install-Certificate -CertFile $certFile
    
    Write-Host ""
    Write-Success "Installation terminée !"
    Write-Info "Redémarrez votre navigateur pour que les changements prennent effet"
    Write-Host ""
}

# Exécuter le script principal
Main

