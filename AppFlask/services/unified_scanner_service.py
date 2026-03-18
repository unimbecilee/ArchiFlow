"""
Service de numérisation unifié
Abstraction qui utilise WIA ou SANE selon l'OS
"""
import os
import platform
import logging
from typing import Dict, List, Optional

from AppFlask.services.scanner_wia_service import get_wia_service
from AppFlask.services.scanner_sane_service import get_sane_service

logger = logging.getLogger(__name__)


class UnifiedScannerService:
    """
    Service de numérisation unifié multi-OS
    Utilise automatiquement WIA (Windows) ou SANE (Linux/macOS)
    """
    
    def __init__(self):
        self.os_type = platform.system()
        self.wia_service = get_wia_service()
        self.sane_service = get_sane_service()
        
        # Déterminer le service à utiliser
        if self.os_type == 'Windows' and self.wia_service.is_available():
            self.active_service = self.wia_service
            self.service_type = 'wia'
            logger.info("Using WIA scanner service (Windows)")
        elif self.sane_service.is_available():
            self.active_service = self.sane_service
            self.service_type = 'sane'
            logger.info("Using SANE scanner service (Linux/macOS)")
        else:
            self.active_service = None
            self.service_type = None
            logger.warning("No scanner service available")
    
    def is_available(self) -> bool:
        """Vérifie si un service de numérisation est disponible"""
        return self.active_service is not None
    
    def get_service_type(self) -> Optional[str]:
        """Retourne le type de service actif (wia ou sane)"""
        return self.service_type
    
    def scan_page(self, scanner_id: str, output_path: str, settings: Dict) -> bool:
        """
        Numérise une page
        
        Args:
            scanner_id: ID du scanner
            output_path: Chemin de sortie
            settings: Paramètres de numérisation
            
        Returns:
            True si la numérisation a réussi
        """
        if not self.active_service:
            raise Exception("No scanner service available")
        
        return self.active_service.scan_page(scanner_id, output_path, settings)
    
    def scan_multiple_pages(self, scanner_id: str, output_dir: str, 
                           num_pages: int, settings: Dict) -> List[str]:
        """
        Numérise plusieurs pages
        
        Args:
            scanner_id: ID du scanner
            output_dir: Répertoire de sortie
            num_pages: Nombre de pages
            settings: Paramètres de numérisation
            
        Returns:
            Liste des chemins des images scannées
        """
        if not self.active_service:
            raise Exception("No scanner service available")
        
        return self.active_service.scan_multiple_pages(
            scanner_id, output_dir, num_pages, settings
        )
    
    def scan_with_feeder(self, scanner_id: str, output_dir: str, settings: Dict) -> List[str]:
        """
        Numérise avec le chargeur automatique
        
        Args:
            scanner_id: ID du scanner
            output_dir: Répertoire de sortie
            settings: Paramètres de numérisation
            
        Returns:
            Liste des chemins des images scannées
        """
        if not self.active_service:
            raise Exception("No scanner service available")
        
        return self.active_service.scan_with_feeder(scanner_id, output_dir, settings)
    
    def get_scanner_capabilities(self, scanner_id: str) -> Dict:
        """
        Récupère les capacités d'un scanner
        
        Args:
            scanner_id: ID du scanner
            
        Returns:
            Dictionnaire des capacités
        """
        if not self.active_service:
            return {}
        
        return self.active_service.get_scanner_capabilities(scanner_id)
    
    def get_preview(self, scanner_id: str, output_path: str) -> bool:
        """
        Obtient une prévisualisation (SANE uniquement)
        
        Args:
            scanner_id: ID du scanner
            output_path: Chemin de sortie
            
        Returns:
            True si la prévisualisation a réussi
        """
        if self.service_type == 'sane':
            return self.sane_service.get_preview(scanner_id, output_path)
        else:
            logger.warning("Preview not supported with WIA")
            return False


# Instance singleton
_unified_service = None

def get_unified_scanner_service() -> UnifiedScannerService:
    """Retourne l'instance singleton du service"""
    global _unified_service
    if _unified_service is None:
        _unified_service = UnifiedScannerService()
    return _unified_service
