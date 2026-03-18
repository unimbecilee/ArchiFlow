"""
Service de numérisation Windows WIA (Windows Image Acquisition)
Implémentation réelle de la numérisation pour Windows
"""
import os
import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class WIAScannerService:
    """
    Service de numérisation via WIA (Windows uniquement)
    """
    
    def __init__(self):
        self.wia_available = False
        try:
            import win32com.client
            self.win32com = win32com
            self.wia_available = True
            logger.info("WIA Scanner Service initialized")
        except ImportError:
            logger.warning("WIA not available (not on Windows or pywin32 not installed)")
    
    def is_available(self) -> bool:
        """Vérifie si WIA est disponible"""
        return self.wia_available
    
    def scan_page(self, scanner_id: str, output_path: str, settings: Dict) -> bool:
        """
        Numérise une page via WIA
        
        Args:
            scanner_id: ID du scanner WIA
            output_path: Chemin de sortie de l'image
            settings: Paramètres de numérisation
            
        Returns:
            True si la numérisation a réussi
        """
        if not self.wia_available:
            raise Exception("WIA not available on this system")
        
        try:
            # Créer le gestionnaire de périphériques
            device_manager = self.win32com.client.Dispatch("WIA.DeviceManager")
            
            # Trouver le scanner
            device = None
            for i in range(1, device_manager.DeviceInfos.Count + 1):
                device_info = device_manager.DeviceInfos.Item(i)
                if device_info.DeviceID == scanner_id:
                    device = device_info.Connect()
                    break
            
            if not device:
                raise Exception(f"Scanner {scanner_id} not found")
            
            # Obtenir l'item de scan
            item = device.Items.Item(1)
            
            # Configurer les paramètres de scan
            self._configure_scan_settings(item, settings)
            
            # Effectuer le scan
            logger.info(f"Scanning with WIA scanner: {scanner_id}")
            image = item.Transfer()
            
            # Sauvegarder l'image
            image_process = self.win32com.client.Dispatch("WIA.ImageProcess")
            image_process.Filters.Add(image_process.FilterInfos("Convert").FilterID)
            
            # Configurer le format de sortie
            convert_filter = image_process.Filters.Item(1)
            
            # Déterminer le format selon l'extension
            ext = os.path.splitext(output_path)[1].lower()
            if ext == '.jpg' or ext == '.jpeg':
                convert_filter.Properties("FormatID").Value = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"  # JPEG
            elif ext == '.png':
                convert_filter.Properties("FormatID").Value = "{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}"  # PNG
            elif ext == '.bmp':
                convert_filter.Properties("FormatID").Value = "{B96B3CAB-0728-11D3-9D7B-0000F81EF32E}"  # BMP
            elif ext == '.tiff' or ext == '.tif':
                convert_filter.Properties("FormatID").Value = "{B96B3CB1-0728-11D3-9D7B-0000F81EF32E}"  # TIFF
            
            # Appliquer les filtres
            image = image_process.Apply(image)
            
            # Sauvegarder
            image.SaveFile(output_path)
            
            logger.info(f"Page scanned successfully: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"WIA scan failed: {e}")
            return False
    
    def scan_multiple_pages(self, scanner_id: str, output_dir: str, 
                           num_pages: int, settings: Dict) -> List[str]:
        """
        Numérise plusieurs pages
        
        Args:
            scanner_id: ID du scanner
            output_dir: Répertoire de sortie
            num_pages: Nombre de pages à scanner
            settings: Paramètres de numérisation
            
        Returns:
            Liste des chemins des images scannées
        """
        scanned_files = []
        
        for i in range(num_pages):
            output_path = os.path.join(output_dir, f"page_{i+1:03d}.jpg")
            
            success = self.scan_page(scanner_id, output_path, settings)
            
            if success:
                scanned_files.append(output_path)
            else:
                logger.warning(f"Failed to scan page {i+1}")
                break
        
        return scanned_files
    
    def scan_with_feeder(self, scanner_id: str, output_dir: str, settings: Dict) -> List[str]:
        """
        Numérise toutes les pages du chargeur automatique
        
        Args:
            scanner_id: ID du scanner
            output_dir: Répertoire de sortie
            settings: Paramètres de numérisation
            
        Returns:
            Liste des chemins des images scannées
        """
        if not self.wia_available:
            raise Exception("WIA not available on this system")
        
        try:
            device_manager = self.win32com.client.Dispatch("WIA.DeviceManager")
            
            # Trouver le scanner
            device = None
            for i in range(1, device_manager.DeviceInfos.Count + 1):
                device_info = device_manager.DeviceInfos.Item(i)
                if device_info.DeviceID == scanner_id:
                    device = device_info.Connect()
                    break
            
            if not device:
                raise Exception(f"Scanner {scanner_id} not found")
            
            # Activer le chargeur automatique
            item = device.Items.Item(1)
            
            # Configurer pour utiliser le feeder
            try:
                item.Properties("Document Handling Select").Value = 1  # Feeder
            except:
                logger.warning("Could not set feeder mode")
            
            scanned_files = []
            page_num = 1
            
            # Scanner jusqu'à ce qu'il n'y ait plus de pages
            while True:
                try:
                    # Configurer les paramètres
                    self._configure_scan_settings(item, settings)
                    
                    # Scanner la page
                    image = item.Transfer()
                    
                    # Sauvegarder
                    output_path = os.path.join(output_dir, f"page_{page_num:03d}.jpg")
                    image.SaveFile(output_path)
                    
                    scanned_files.append(output_path)
                    logger.info(f"Scanned page {page_num}: {output_path}")
                    
                    page_num += 1
                    
                except Exception as e:
                    # Plus de pages dans le chargeur
                    logger.info(f"Feeder scan completed: {len(scanned_files)} pages")
                    break
            
            return scanned_files
            
        except Exception as e:
            logger.error(f"Feeder scan failed: {e}")
            return []
    
    def _configure_scan_settings(self, item, settings: Dict):
        """Configure les paramètres de scan WIA"""
        try:
            # Résolution
            if 'resolution' in settings:
                resolution = settings['resolution']
                try:
                    item.Properties("Horizontal Resolution").Value = resolution
                    item.Properties("Vertical Resolution").Value = resolution
                except:
                    logger.warning(f"Could not set resolution to {resolution}")
            
            # Mode couleur
            if 'color_mode' in settings:
                color_mode = settings['color_mode']
                try:
                    if color_mode == 'color':
                        item.Properties("Current Intent").Value = 1  # Color
                    elif color_mode == 'grayscale':
                        item.Properties("Current Intent").Value = 2  # Grayscale
                    elif color_mode == 'bw':
                        item.Properties("Current Intent").Value = 4  # Text (B&W)
                except:
                    logger.warning(f"Could not set color mode to {color_mode}")
            
            # Format de page
            if 'page_size' in settings:
                page_size = settings['page_size']
                # TODO: Configurer la taille de page si supporté
            
        except Exception as e:
            logger.warning(f"Error configuring scan settings: {e}")
    
    def get_scanner_capabilities(self, scanner_id: str) -> Dict:
        """
        Récupère les capacités d'un scanner
        
        Args:
            scanner_id: ID du scanner
            
        Returns:
            Dictionnaire des capacités
        """
        if not self.wia_available:
            return {}
        
        try:
            device_manager = self.win32com.client.Dispatch("WIA.DeviceManager")
            
            device = None
            for i in range(1, device_manager.DeviceInfos.Count + 1):
                device_info = device_manager.DeviceInfos.Item(i)
                if device_info.DeviceID == scanner_id:
                    device = device_info.Connect()
                    break
            
            if not device:
                return {}
            
            item = device.Items.Item(1)
            capabilities = {}
            
            # Lister toutes les propriétés disponibles
            for prop in item.Properties:
                try:
                    capabilities[prop.Name] = {
                        'value': prop.Value,
                        'type': prop.Type,
                        'is_read_only': prop.IsReadOnly
                    }
                except:
                    pass
            
            return capabilities
            
        except Exception as e:
            logger.error(f"Failed to get scanner capabilities: {e}")
            return {}


# Instance singleton
_wia_service = None

def get_wia_service() -> WIAScannerService:
    """Retourne l'instance singleton du service"""
    global _wia_service
    if _wia_service is None:
        _wia_service = WIAScannerService()
    return _wia_service
