"""
Service de détection de scanners
Support multi-marques et multi-OS (Windows prioritaire)
"""
import os
import platform
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ScannerDetectionService:
    """
    Service de détection de scanners compatible multi-marques et multi-OS
    - Windows: WIA (prioritaire)
    - Linux: SANE
    - USB: Détection générique
    - Réseau: ESC/POS, IP
    """
    
    def __init__(self):
        self.os_type = platform.system()
        self.cache = {}
        self.cache_duration = timedelta(minutes=5)
        logger.info(f"Scanner Detection Service initialized on {self.os_type}")
    
    def detect_scanners(self, force_refresh: bool = False) -> List[Dict]:
        """
        Détecte tous les scanners disponibles
        
        Args:
            force_refresh: Force la détection même si le cache est valide
            
        Returns:
            Liste des scanners détectés avec leurs informations
        """
        # Vérifier le cache
        if not force_refresh and self._is_cache_valid():
            logger.info("Returning cached scanner list")
            return self.cache.get('scanners', [])
        
        scanners = []
        
        try:
            # Détection selon l'OS
            if self.os_type == 'Windows':
                scanners.extend(self._detect_windows_wia())
            elif self.os_type == 'Linux':
                scanners.extend(self._detect_linux_sane())
            elif self.os_type == 'Darwin':  # macOS
                scanners.extend(self._detect_macos_sane())
            
            # Détection USB générique (tous OS)
            scanners.extend(self._detect_usb_scanners())
            
            # Détection réseau (tous OS)
            scanners.extend(self._detect_network_scanners())
            
            # Mise à jour du cache
            self.cache = {
                'scanners': scanners,
                'timestamp': datetime.now()
            }
            
            logger.info(f"Detected {len(scanners)} scanner(s)")
            return scanners
            
        except Exception as e:
            logger.error(f"Error detecting scanners: {e}")
            return []
    
    def _detect_windows_wia(self) -> List[Dict]:
        """Détection via Windows Image Acquisition (WIA)"""
        scanners = []
        
        try:
            import win32com.client
            
            wia = win32com.client.Dispatch("WIA.DeviceManager")
            
            for i in range(1, wia.DeviceInfos.Count + 1):
                device_info = wia.DeviceInfos.Item(i)
                
                # Vérifier si c'est un scanner
                if device_info.Type == 1:  # Scanner type
                    scanner = {
                        'id': device_info.DeviceID,
                        'name': device_info.Properties("Name").Value,
                        'manufacturer': device_info.Properties("Manufacturer").Value if "Manufacturer" in [p.Name for p in device_info.Properties] else "Unknown",
                        'type': 'wia',
                        'connection': 'usb',
                        'os': 'Windows',
                        'available': True
                    }
                    scanners.append(scanner)
                    logger.info(f"WIA Scanner found: {scanner['name']}")
                    
        except ImportError:
            logger.warning("pywin32 not available - WIA detection skipped")
        except Exception as e:
            logger.error(f"WIA detection error: {e}")
        
        return scanners
    
    def _detect_linux_sane(self) -> List[Dict]:
        """Détection via SANE (Scanner Access Now Easy)"""
        scanners = []
        
        try:
            import sane
            
            sane.init()
            devices = sane.get_devices()
            
            for device in devices:
                scanner = {
                    'id': device[0],
                    'name': device[2],
                    'manufacturer': device[1],
                    'type': 'sane',
                    'connection': device[3] if len(device) > 3 else 'unknown',
                    'os': 'Linux',
                    'available': True
                }
                scanners.append(scanner)
                logger.info(f"SANE Scanner found: {scanner['name']}")
                
        except ImportError:
            logger.warning("python-sane not available - SANE detection skipped")
        except Exception as e:
            logger.error(f"SANE detection error: {e}")
        
        return scanners
    
    def _detect_macos_sane(self) -> List[Dict]:
        """Détection via SANE sur macOS"""
        # macOS peut utiliser SANE si installé
        return self._detect_linux_sane()
    
    def _detect_usb_scanners(self) -> List[Dict]:
        """Détection USB générique"""
        scanners = []
        
        try:
            import usb.core
            import usb.util
            
            # Scanner USB class code: 0x06 (Imaging)
            devices = usb.core.find(find_all=True, bDeviceClass=0x06)
            
            for device in devices:
                try:
                    manufacturer = usb.util.get_string(device, device.iManufacturer) if device.iManufacturer else "Unknown"
                    product = usb.util.get_string(device, device.iProduct) if device.iProduct else "USB Scanner"
                    
                    scanner = {
                        'id': f"usb:{device.idVendor:04x}:{device.idProduct:04x}",
                        'name': product,
                        'manufacturer': manufacturer,
                        'type': 'usb',
                        'connection': 'usb',
                        'os': self.os_type,
                        'available': True,
                        'vendor_id': device.idVendor,
                        'product_id': device.idProduct
                    }
                    scanners.append(scanner)
                    logger.info(f"USB Scanner found: {scanner['name']}")
                    
                except Exception as e:
                    logger.warning(f"Error reading USB device: {e}")
                    
        except ImportError:
            logger.warning("pyusb not available - USB detection skipped")
        except Exception as e:
            logger.error(f"USB detection error: {e}")
        
        return scanners
    
    def _detect_network_scanners(self) -> List[Dict]:
        """Détection de scanners réseau"""
        scanners = []
        
        # TODO: Implémenter la détection réseau
        # - Scan des ports réseau (9100, 631, etc.)
        # - Protocole ESC/POS
        # - SNMP discovery
        
        logger.info("Network scanner detection not yet implemented")
        
        return scanners
    
    def _is_cache_valid(self) -> bool:
        """Vérifie si le cache est encore valide"""
        if 'timestamp' not in self.cache:
            return False
        
        age = datetime.now() - self.cache['timestamp']
        return age < self.cache_duration
    
    def get_scanner_by_id(self, scanner_id: str) -> Optional[Dict]:
        """
        Récupère un scanner par son ID
        
        Args:
            scanner_id: ID du scanner
            
        Returns:
            Informations du scanner ou None
        """
        scanners = self.detect_scanners()
        
        for scanner in scanners:
            if scanner['id'] == scanner_id:
                return scanner
        
        return None
    
    def test_scanner_connection(self, scanner_id: str) -> bool:
        """
        Teste la connexion à un scanner
        
        Args:
            scanner_id: ID du scanner
            
        Returns:
            True si le scanner est accessible
        """
        scanner = self.get_scanner_by_id(scanner_id)
        
        if not scanner:
            return False
        
        try:
            # Test selon le type
            if scanner['type'] == 'wia':
                return self._test_wia_connection(scanner_id)
            elif scanner['type'] == 'sane':
                return self._test_sane_connection(scanner_id)
            elif scanner['type'] == 'usb':
                return self._test_usb_connection(scanner)
            
            return False
            
        except Exception as e:
            logger.error(f"Scanner connection test failed: {e}")
            return False
    
    def _test_wia_connection(self, scanner_id: str) -> bool:
        """Test connexion WIA"""
        try:
            import win32com.client
            wia = win32com.client.Dispatch("WIA.DeviceManager")
            
            for i in range(1, wia.DeviceInfos.Count + 1):
                device_info = wia.DeviceInfos.Item(i)
                if device_info.DeviceID == scanner_id:
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"WIA connection test error: {e}")
            return False
    
    def _test_sane_connection(self, scanner_id: str) -> bool:
        """Test connexion SANE"""
        try:
            import sane
            sane.init()
            device = sane.open(scanner_id)
            device.close()
            return True
            
        except Exception as e:
            logger.error(f"SANE connection test error: {e}")
            return False
    
    def _test_usb_connection(self, scanner: Dict) -> bool:
        """Test connexion USB"""
        try:
            import usb.core
            
            device = usb.core.find(
                idVendor=scanner.get('vendor_id'),
                idProduct=scanner.get('product_id')
            )
            
            return device is not None
            
        except Exception as e:
            logger.error(f"USB connection test error: {e}")
            return False


# Instance singleton
_scanner_service = None

def get_scanner_service() -> ScannerDetectionService:
    """Retourne l'instance singleton du service"""
    global _scanner_service
    if _scanner_service is None:
        _scanner_service = ScannerDetectionService()
    return _scanner_service
