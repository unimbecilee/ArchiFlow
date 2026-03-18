"""
Service de traitement d'images avancé
Utilise OpenCV et scikit-image pour améliorer la qualité des scans
"""
import cv2
import numpy as np
from PIL import Image
import logging
from typing import Tuple, Optional
from skimage import filters, morphology, exposure
from skimage.transform import rotate

logger = logging.getLogger(__name__)


class ImageProcessingService:
    """
    Service de traitement d'images pour améliorer la qualité des scans
    """
    
    def __init__(self):
        logger.info("Image Processing Service initialized")
    
    def enhance_image(self, image_path: str, output_path: str, settings: dict) -> bool:
        """
        Améliore une image scannée
        
        Args:
            image_path: Chemin de l'image source
            output_path: Chemin de l'image de sortie
            settings: Paramètres de traitement
            
        Returns:
            True si le traitement a réussi
        """
        try:
            # Charger l'image
            img = cv2.imread(image_path)
            
            if img is None:
                raise Exception(f"Failed to load image: {image_path}")
            
            # Appliquer les traitements selon les paramètres
            if settings.get('auto_border_detection', True):
                img = self.detect_and_crop_borders(img)
            
            if settings.get('auto_deskew', True):
                img = self.deskew_image(img)
            
            if settings.get('denoise', True):
                img = self.denoise_image(img)
            
            if settings.get('enhance_contrast', True):
                img = self.enhance_contrast(img)
            
            if settings.get('sharpen', False):
                img = self.sharpen_image(img)
            
            # Conversion en niveaux de gris si demandé
            if settings.get('grayscale', False):
                img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Binarisation si demandé
            if settings.get('binarize', False):
                img = self.binarize_image(img)
            
            # Compression et sauvegarde
            quality = settings.get('quality', 85)
            cv2.imwrite(output_path, img, [cv2.IMWRITE_JPEG_QUALITY, quality])
            
            logger.info(f"Image processed successfully: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            return False
    
    def detect_and_crop_borders(self, img: np.ndarray) -> np.ndarray:
        """
        Détecte et recadre les bordures d'un document
        
        Args:
            img: Image source
            
        Returns:
            Image recadrée
        """
        try:
            # Convertir en niveaux de gris
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Appliquer un flou pour réduire le bruit
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Détection de contours
            edges = cv2.Canny(blurred, 50, 150)
            
            # Trouver les contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return img
            
            # Trouver le plus grand contour (probablement le document)
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Obtenir le rectangle englobant
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # Vérifier que le contour est significatif
            img_area = img.shape[0] * img.shape[1]
            contour_area = w * h
            
            if contour_area > img_area * 0.5:  # Au moins 50% de l'image
                # Ajouter une petite marge
                margin = 10
                x = max(0, x - margin)
                y = max(0, y - margin)
                w = min(img.shape[1] - x, w + 2 * margin)
                h = min(img.shape[0] - y, h + 2 * margin)
                
                return img[y:y+h, x:x+w]
            
            return img
            
        except Exception as e:
            logger.warning(f"Border detection failed: {e}")
            return img
    
    def deskew_image(self, img: np.ndarray) -> np.ndarray:
        """
        Redresse une image inclinée
        
        Args:
            img: Image source
            
        Returns:
            Image redressée
        """
        try:
            # Convertir en niveaux de gris
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Inverser les couleurs pour la détection
            gray = cv2.bitwise_not(gray)
            
            # Détecter l'angle d'inclinaison
            coords = np.column_stack(np.where(gray > 0))
            
            if len(coords) == 0:
                return img
            
            # Calculer l'angle via minAreaRect
            angle = cv2.minAreaRect(coords)[-1]
            
            # Ajuster l'angle
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            
            # Ne corriger que si l'angle est significatif
            if abs(angle) < 0.5:
                return img
            
            # Rotation de l'image
            (h, w) = img.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            
            logger.info(f"Image deskewed by {angle:.2f} degrees")
            return rotated
            
        except Exception as e:
            logger.warning(f"Deskew failed: {e}")
            return img
    
    def denoise_image(self, img: np.ndarray) -> np.ndarray:
        """
        Réduit le bruit dans une image
        
        Args:
            img: Image source
            
        Returns:
            Image débruitée
        """
        try:
            # Utiliser le filtre Non-Local Means Denoising
            if len(img.shape) == 3:
                denoised = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
            else:
                denoised = cv2.fastNlMeansDenoising(img, None, 10, 7, 21)
            
            return denoised
            
        except Exception as e:
            logger.warning(f"Denoising failed: {e}")
            return img
    
    def enhance_contrast(self, img: np.ndarray) -> np.ndarray:
        """
        Améliore le contraste d'une image
        
        Args:
            img: Image source
            
        Returns:
            Image avec contraste amélioré
        """
        try:
            # Convertir en LAB
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            
            # Séparer les canaux
            l, a, b = cv2.split(lab)
            
            # Appliquer CLAHE (Contrast Limited Adaptive Histogram Equalization)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            # Fusionner les canaux
            enhanced = cv2.merge([l, a, b])
            
            # Convertir en BGR
            enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
            
            return enhanced
            
        except Exception as e:
            logger.warning(f"Contrast enhancement failed: {e}")
            return img
    
    def sharpen_image(self, img: np.ndarray) -> np.ndarray:
        """
        Améliore la netteté d'une image
        
        Args:
            img: Image source
            
        Returns:
            Image plus nette
        """
        try:
            # Kernel de netteté
            kernel = np.array([[-1, -1, -1],
                             [-1,  9, -1],
                             [-1, -1, -1]])
            
            sharpened = cv2.filter2D(img, -1, kernel)
            
            return sharpened
            
        except Exception as e:
            logger.warning(f"Sharpening failed: {e}")
            return img
    
    def binarize_image(self, img: np.ndarray) -> np.ndarray:
        """
        Binarise une image (noir et blanc)
        
        Args:
            img: Image source
            
        Returns:
            Image binarisée
        """
        try:
            # Convertir en niveaux de gris si nécessaire
            if len(img.shape) == 3:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            else:
                gray = img
            
            # Binarisation adaptative
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            
            return binary
            
        except Exception as e:
            logger.warning(f"Binarization failed: {e}")
            return img
    
    def correct_perspective(self, img: np.ndarray, corners: np.ndarray) -> np.ndarray:
        """
        Corrige la perspective d'une image
        
        Args:
            img: Image source
            corners: Coins du document (4 points)
            
        Returns:
            Image avec perspective corrigée
        """
        try:
            # Trier les coins (haut-gauche, haut-droite, bas-droite, bas-gauche)
            rect = self._order_points(corners)
            (tl, tr, br, bl) = rect
            
            # Calculer la largeur du document
            widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
            widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
            maxWidth = max(int(widthA), int(widthB))
            
            # Calculer la hauteur du document
            heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
            heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
            maxHeight = max(int(heightA), int(heightB))
            
            # Destination points
            dst = np.array([
                [0, 0],
                [maxWidth - 1, 0],
                [maxWidth - 1, maxHeight - 1],
                [0, maxHeight - 1]
            ], dtype="float32")
            
            # Calculer la matrice de transformation
            M = cv2.getPerspectiveTransform(rect, dst)
            
            # Appliquer la transformation
            warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))
            
            return warped
            
        except Exception as e:
            logger.warning(f"Perspective correction failed: {e}")
            return img
    
    def _order_points(self, pts: np.ndarray) -> np.ndarray:
        """Ordonne les points dans le sens horaire"""
        rect = np.zeros((4, 2), dtype="float32")
        
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]
        
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        
        return rect
    
    def compress_image(self, input_path: str, output_path: str, 
                      max_size_kb: int = 500, quality: int = 85) -> bool:
        """
        Compresse une image pour réduire sa taille
        
        Args:
            input_path: Chemin de l'image source
            output_path: Chemin de l'image de sortie
            max_size_kb: Taille maximale en Ko
            quality: Qualité JPEG (1-100)
            
        Returns:
            True si la compression a réussi
        """
        try:
            img = Image.open(input_path)
            
            # Convertir en RGB si nécessaire
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Sauvegarder avec compression
            img.save(output_path, 'JPEG', quality=quality, optimize=True)
            
            # Vérifier la taille
            import os
            size_kb = os.path.getsize(output_path) / 1024
            
            # Si trop gros, réduire la qualité
            if size_kb > max_size_kb and quality > 50:
                new_quality = int(quality * (max_size_kb / size_kb))
                img.save(output_path, 'JPEG', quality=new_quality, optimize=True)
            
            logger.info(f"Image compressed: {size_kb:.2f} KB")
            return True
            
        except Exception as e:
            logger.error(f"Image compression failed: {e}")
            return False


# Instance singleton
_image_service = None

def get_image_service() -> ImageProcessingService:
    """Retourne l'instance singleton du service"""
    global _image_service
    if _image_service is None:
        _image_service = ImageProcessingService()
    return _image_service
