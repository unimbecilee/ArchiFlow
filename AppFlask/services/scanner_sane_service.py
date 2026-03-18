"""
Service de numérisation SANE (Scanner Access Now Easy)
Implémentation réelle de la numérisation pour Linux/macOS
"""
import os
import logging
from typing import Dict, List, Optional
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)


class SANEScannerService:
    """
    Service de numérisation via SANE (Linux/macOS)
    """
    
    def __init__(self):
        self.sane_available = False
        try:
            import sane
            self.sane = sane
            sane.init()
            self.sane_available = True
            logger.info("SANE Scanner Service initialized")
        except ImportError:
            logger.warning("SANE not available (python-sane not installed)")
        except Exception as e:
            logger.warning(f"SANE initialization failed: {e}")
    
    def is_available(self) -> bool:
        """Vérifie si SANE est disponible"""
        return self.sane_available
    
    def scan_page(self, scanner_id: str, output_path: str, settings: Dict) -> bool:
        """
        Numérise une page via SANE
        
        Args:
            scanner_id: ID du scanner SANE
            output_path: Chemin de sortie de l'image
            settings: Paramètres de numérisation
            
        Returns:
            True si la numérisation a réussi
        """
        if not self.sane_available:
            raise Exception("SANE not available on this system")
        
        try:
            # Ouvrir le scanner
            logger.info(f"Opening SANE scanner: {scanner_id}")
            device = self.sane.open(scanner_id)
            
            # Configurer les paramètres
            self._configure_scan_settings(device, settings)
            
            # Effectuer le scan
            logger.info("Starting scan...")
            device.start()
            
            # Récupérer l'image
            image_data = device.snap()
            
            # Convertir en image PIL
            if len(image_data.shape) == 2:
                # Niveaux de gris
                img = Image.fromarray(image_data, mode='L')
            elif len(image_data.shape) == 3:
                # Couleur
                img = Image.fromarray(image_data, mode='RGB')
            else:
                raise Exception(f"Unexpected image shape: {image_data.shape}")
            
            # Sauvegarder
            img.save(output_path)
            
            # Fermer le scanner
            device.close()
            
            logger.info(f"Page scanned successfully: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"SANE scan failed: {e}")
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
        
        try:
            device = self.sane.open(scanner_id)
            
            for i in range(num_pages):
                try:
                    # Configurer les paramètres
                    self._configure_scan_settings(device, settings)
                    
                    # Scanner
                    device.start()
                    image_data = device.snap()
                    
                    # Convertir et sauvegarder
                    output_path = os.path.join(output_dir, f"page_{i+1:03d}.jpg")
                    
                    if len(image_data.shape) == 2:
                        img = Image.fromarray(image_data, mode='L')
                    else:
                        img = Image.fromarray(image_data, mode='RGB')
                    
                    img.save(output_path)
                    scanned_files.append(output_path)
                    
                    logger.info(f"Scanned page {i+1}: {output_path}")
                    
                except Exception as e:
                    logger.error(f"Failed to scan page {i+1}: {e}")
                    break
            
            device.close()
            
        except Exception as e:
            logger.error(f"Multi-page scan failed: {e}")
        
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
        if not self.sane_available:
            raise Exception("SANE not available on this system")
        
        try:
            device = self.sane.open(scanner_id)
            
            # Activer le mode ADF (Automatic Document Feeder) si disponible
            try:
                if hasattr(device, 'source'):
                    device.source = 'ADF'
                elif hasattr(device, 'doc_source'):
                    device.doc_source = 'ADF'
            except:
                logger.warning("Could not set ADF mode")
            
            scanned_files = []
            page_num = 1
            
            # Scanner jusqu'à ce qu'il n'y ait plus de pages
            while True:
                try:
                    # Configurer les paramètres
                    self._configure_scan_settings(device, settings)
                    
                    # Scanner la page
                    device.start()
                    image_data = device.snap()
                    
                    # Convertir et sauvegarder
                    output_path = os.path.join(output_dir, f"page_{page_num:03d}.jpg")
                    
                    if len(image_data.shape) == 2:
                        img = Image.fromarray(image_data, mode='L')
                    else:
                        img = Image.fromarray(image_data, mode='RGB')
                    
                    img.save(output_path)
                    scanned_files.append(output_path)
                    
                    logger.info(f"Scanned page {page_num}: {output_path}")
                    page_num += 1
                    
                except Exception as e:
                    # Plus de pages dans le chargeur
                    logger.info(f"Feeder scan completed: {len(scanned_files)} pages")
                    break
            
            device.close()
            return scanned_files
            
        except Exception as e:
            logger.error(f"Feeder scan failed: {e}")
            return []
    
    def _configure_scan_settings(self, device, settings: Dict):
        """Configure les paramètres de scan SANE"""
        try:
            # Résolution
            if 'resolution' in settings and hasattr(device, 'resolution'):
                try:
                    device.resolution = settings['resolution']
                except:
                    logger.warning(f"Could not set resolution")
            
            # Mode couleur
            if 'color_mode' in settings and hasattr(device, 'mode'):
                color_mode = settings['color_mode']
                try:
                    if color_mode == 'color':
                        device.mode = 'Color'
                    elif color_mode == 'grayscale':
                        device.mode = 'Gray'
                    elif color_mode == 'bw':
                        device.mode = 'Lineart'
                except:
                    logger.warning(f"Could not set color mode")
            
            # Zone de scan (si spécifiée)
            if 'scan_area' in settings:
                area = settings['scan_area']
                try:
                    if hasattr(device, 'tl_x'):
                        device.tl_x = area.get('x', 0)
                    if hasattr(device, 'tl_y'):
                        device.tl_y = area.get('y', 0)
                    if hasattr(device, 'br_x'):
                        device.br_x = area.get('width', 210)
                    if hasattr(device, 'br_y'):
                        device.br_y = area.get('height', 297)
                except:
                    logger.warning("Could not set scan area")
            
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
        if not self.sane_available:
            return {}
        
        try:
            device = self.sane.open(scanner_id)
            
            capabilities = {}
            
            # Lister toutes les options disponibles
            for option in device.get_options():
                try:
                    capabilities[option[1]] = {
                        'title': option[2],
                        'desc': option[3],
                        'type': option[4],
                        'unit': option[5] if len(option) > 5 else None,
                        'constraint': option[8] if len(option) > 8 else None
                    }
                except:
                    pass
            
            device.close()
            return capabilities
            
        except Exception as e:
            logger.error(f"Failed to get scanner capabilities: {e}")
            return {}
    
    def get_preview(self, scanner_id: str, output_path: str) -> bool:
        """
        Obtient une prévisualisation basse résolution
        
        Args:
            scanner_id: ID du scanner
            output_path: Chemin de sortie
            
        Returns:
            True si la prévisualisation a réussi
        """
        try:
            device = self.sane.open(scanner_id)
            
            # Configurer pour une prévisualisation rapide
            if hasattr(device, 'resolution'):
                device.resolution = 75  # Basse résolution
            if hasattr(device, 'preview'):
                device.preview = True
            
            # Scanner
            device.start()
            image_data = device.snap()
            
            # Convertir et sauvegarder
            if len(image_data.shape) == 2:
                img = Image.fromarray(image_data, mode='L')
            else:
                img = Image.fromarray(image_data, mode='RGB')
            
            img.save(output_path)
            device.close()
            
            logger.info(f"Preview saved: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Preview failed: {e}")
            return False


# Instance singleton
_sane_service = None

def get_sane_service() -> SANEScannerService:
    """Retourne l'instance singleton du service"""
    global _sane_service
    if _sane_service is None:
        _sane_service = SANEScannerService()
    return _sane_service
