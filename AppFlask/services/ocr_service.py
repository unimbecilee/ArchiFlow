"""
Service OCR avancé avec extraction de métadonnées
Utilise Tesseract pour la reconnaissance de texte
"""
import os
import re
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import pytesseract
from PIL import Image
import cv2
import numpy as np

logger = logging.getLogger(__name__)


class OCRService:
    """
    Service OCR avancé avec extraction de métadonnées
    """
    
    def __init__(self):
        self.languages = ['fra', 'eng']  # Français et Anglais par défaut
        logger.info("OCR Service initialized")
    
    def perform_ocr(self, image_path: str, language: str = 'fra') -> Dict:
        """
        Effectue l'OCR sur une image
        
        Args:
            image_path: Chemin de l'image
            language: Langue(s) pour l'OCR (fra, eng, etc.)
            
        Returns:
            Dictionnaire avec le texte et les métadonnées
        """
        try:
            # Charger l'image
            img = Image.open(image_path)
            
            # Configuration Tesseract
            custom_config = r'--oem 3 --psm 3'
            
            # Effectuer l'OCR
            text = pytesseract.image_to_string(img, lang=language, config=custom_config)
            
            # Obtenir les données détaillées
            data = pytesseract.image_to_data(img, lang=language, output_type=pytesseract.Output.DICT)
            
            # Calculer la confiance moyenne
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Extraire les métadonnées
            metadata = self.extract_metadata(text)
            
            result = {
                'text': text.strip(),
                'confidence': round(avg_confidence, 2),
                'word_count': len(text.split()),
                'char_count': len(text),
                'language': language,
                'metadata': metadata,
                'extracted_at': datetime.now().isoformat()
            }
            
            logger.info(f"OCR completed: {result['word_count']} words, {result['confidence']}% confidence")
            return result
            
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            return {
                'text': '',
                'confidence': 0,
                'word_count': 0,
                'char_count': 0,
                'language': language,
                'metadata': {},
                'error': str(e)
            }
    
    def perform_ocr_with_boxes(self, image_path: str, language: str = 'fra') -> Dict:
        """
        Effectue l'OCR avec les coordonnées des mots
        
        Args:
            image_path: Chemin de l'image
            language: Langue pour l'OCR
            
        Returns:
            Dictionnaire avec texte et coordonnées
        """
        try:
            img = Image.open(image_path)
            
            # Obtenir les données avec coordonnées
            data = pytesseract.image_to_data(img, lang=language, output_type=pytesseract.Output.DICT)
            
            # Organiser les données par ligne
            lines = []
            current_line = []
            current_line_num = -1
            
            for i in range(len(data['text'])):
                if int(data['conf'][i]) > 0:  # Ignorer les mots avec confiance nulle
                    word_data = {
                        'text': data['text'][i],
                        'confidence': int(data['conf'][i]),
                        'left': data['left'][i],
                        'top': data['top'][i],
                        'width': data['width'][i],
                        'height': data['height'][i]
                    }
                    
                    line_num = data['line_num'][i]
                    
                    if line_num != current_line_num:
                        if current_line:
                            lines.append(current_line)
                        current_line = [word_data]
                        current_line_num = line_num
                    else:
                        current_line.append(word_data)
            
            if current_line:
                lines.append(current_line)
            
            # Reconstruire le texte
            full_text = '\n'.join([
                ' '.join([word['text'] for word in line])
                for line in lines
            ])
            
            return {
                'text': full_text,
                'lines': lines,
                'language': language
            }
            
        except Exception as e:
            logger.error(f"OCR with boxes failed: {e}")
            return {
                'text': '',
                'lines': [],
                'language': language,
                'error': str(e)
            }
    
    def extract_metadata(self, text: str) -> Dict:
        """
        Extrait les métadonnées du texte OCR
        
        Args:
            text: Texte OCR
            
        Returns:
            Dictionnaire de métadonnées
        """
        metadata = {}
        
        # Extraire les dates
        dates = self._extract_dates(text)
        if dates:
            metadata['dates'] = dates
        
        # Extraire les emails
        emails = self._extract_emails(text)
        if emails:
            metadata['emails'] = emails
        
        # Extraire les numéros de téléphone
        phones = self._extract_phone_numbers(text)
        if phones:
            metadata['phone_numbers'] = phones
        
        # Extraire les montants
        amounts = self._extract_amounts(text)
        if amounts:
            metadata['amounts'] = amounts
        
        # Extraire les numéros de document
        doc_numbers = self._extract_document_numbers(text)
        if doc_numbers:
            metadata['document_numbers'] = doc_numbers
        
        return metadata
    
    def _extract_dates(self, text: str) -> List[str]:
        """Extrait les dates du texte"""
        date_patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',  # DD/MM/YYYY ou DD-MM-YYYY
            r'\b\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}\b',
            r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',  # YYYY/MM/DD
        ]
        
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            dates.extend(matches)
        
        return list(set(dates))
    
    def _extract_emails(self, text: str) -> List[str]:
        """Extrait les adresses email du texte"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        return list(set(emails))
    
    def _extract_phone_numbers(self, text: str) -> List[str]:
        """Extrait les numéros de téléphone du texte"""
        phone_patterns = [
            r'\b(?:0|\+33)[1-9](?:[\s.-]?\d{2}){4}\b',  # Format français
            r'\b\d{10}\b',  # 10 chiffres
        ]
        
        phones = []
        for pattern in phone_patterns:
            matches = re.findall(pattern, text)
            phones.extend(matches)
        
        return list(set(phones))
    
    def _extract_amounts(self, text: str) -> List[str]:
        """Extrait les montants du texte"""
        amount_patterns = [
            r'\b\d+[,.]?\d*\s*(?:€|EUR|euros?)\b',
            r'\b\d+[,.]?\d*\s*(?:\$|USD|dollars?)\b',
        ]
        
        amounts = []
        for pattern in amount_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            amounts.extend(matches)
        
        return list(set(amounts))
    
    def _extract_document_numbers(self, text: str) -> List[str]:
        """Extrait les numéros de document du texte"""
        doc_patterns = [
            r'\b(?:N°|No|Numéro|Ref|Référence)[\s:]*([A-Z0-9-]+)\b',
            r'\b(?:Facture|Invoice|Devis|Quote)[\s:]*([A-Z0-9-]+)\b',
        ]
        
        doc_numbers = []
        for pattern in doc_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            doc_numbers.extend(matches)
        
        return list(set(doc_numbers))
    
    def preprocess_for_ocr(self, image_path: str, output_path: str) -> bool:
        """
        Prétraite une image pour améliorer l'OCR
        
        Args:
            image_path: Chemin de l'image source
            output_path: Chemin de l'image prétraitée
            
        Returns:
            True si le prétraitement a réussi
        """
        try:
            # Charger l'image
            img = cv2.imread(image_path)
            
            # Convertir en niveaux de gris
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Appliquer un filtre bilateral pour réduire le bruit
            denoised = cv2.bilateralFilter(gray, 9, 75, 75)
            
            # Binarisation adaptative
            binary = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Morphologie pour nettoyer
            kernel = np.ones((1, 1), np.uint8)
            cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            
            # Sauvegarder
            cv2.imwrite(output_path, cleaned)
            
            logger.info(f"Image preprocessed for OCR: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"OCR preprocessing failed: {e}")
            return False
    
    def get_supported_languages(self) -> List[str]:
        """
        Retourne la liste des langues supportées par Tesseract
        
        Returns:
            Liste des codes de langue
        """
        try:
            langs = pytesseract.get_languages()
            return langs
        except Exception as e:
            logger.error(f"Failed to get supported languages: {e}")
            return self.languages


# Instance singleton
_ocr_service = None

def get_ocr_service() -> OCRService:
    """Retourne l'instance singleton du service"""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service
