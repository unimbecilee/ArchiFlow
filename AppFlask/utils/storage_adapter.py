"""
Adaptateur de stockage unifié
Permet de basculer entre Cloudinary et MinIO selon la configuration
"""

import os
import logging
from typing import Optional, BinaryIO
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Déterminer le backend de stockage à utiliser
STORAGE_BACKEND = os.getenv('STORAGE_BACKEND', 'minio').lower()


class StorageAdapter:
    """Adaptateur unifié pour le stockage de fichiers"""

    def __init__(self):
        """Initialise l'adaptateur selon le backend configuré"""
        self.backend = STORAGE_BACKEND
        logger.info(f"📦 Backend de stockage: {self.backend.upper()}")

        if self.backend == 'minio':
            from AppFlask.services.minio_service import minio_service
            self.service = minio_service
        elif self.backend == 'cloudinary':
            # Garder la compatibilité avec Cloudinary si besoin
            try:
                import cloudinary
                import cloudinary.uploader
                cloudinary.config(
                    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
                    api_key=os.getenv('CLOUDINARY_API_KEY'),
                    api_secret=os.getenv('CLOUDINARY_API_SECRET')
                )
                self.service = cloudinary
                logger.info("✅ Cloudinary configuré")
            except Exception as e:
                logger.error(f"❌ Erreur configuration Cloudinary: {e}")
                self.service = None
        else:
            logger.error(f"❌ Backend de stockage inconnu: {self.backend}")
            self.service = None

    def upload_file(
        self,
        file_data: BinaryIO,
        filename: str,
        content_type: str = 'application/octet-stream',
        is_thumbnail: bool = False
    ) -> Optional[dict]:
        """
        Upload un fichier vers le backend de stockage

        Args:
            file_data: Données du fichier
            filename: Nom du fichier
            content_type: Type MIME
            is_thumbnail: True si miniature

        Returns:
            dict avec url, object_name/public_id, etc.
        """
        if not self.service:
            logger.error("Service de stockage non disponible")
            return None

        try:
            if self.backend == 'minio':
                return self.service.upload_file(
                    file_data=file_data,
                    filename=filename,
                    content_type=content_type,
                    is_thumbnail=is_thumbnail
                )
            elif self.backend == 'cloudinary':
                # Logique Cloudinary (à adapter selon votre code existant)
                result = self.service.uploader.upload(
                    file_data,
                    folder='esag-documents' if not is_thumbnail else 'esag-thumbnails',
                    resource_type='auto'
                )
                return {
                    'url': result.get('secure_url'),
                    'public_id': result.get('public_id'),
                    'size': result.get('bytes'),
                    'content_type': content_type
                }
        except Exception as e:
            logger.error(f"❌ Erreur upload: {e}")
            return None

    def delete_file(self, object_name: str, is_thumbnail: bool = False) -> bool:
        """
        Supprime un fichier du backend de stockage

        Args:
            object_name: Identifiant du fichier (object_name pour MinIO, public_id pour Cloudinary)
            is_thumbnail: True si miniature

        Returns:
            True si succès
        """
        if not self.service:
            logger.error("Service de stockage non disponible")
            return False

        try:
            if self.backend == 'minio':
                return self.service.delete_file(
                    object_name=object_name,
                    is_thumbnail=is_thumbnail
                )
            elif self.backend == 'cloudinary':
                result = self.service.uploader.destroy(object_name)
                return result.get('result') == 'ok'
        except Exception as e:
            logger.error(f"❌ Erreur suppression: {e}")
            return False

    def get_file_url(self, object_name: str, is_thumbnail: bool = False) -> Optional[str]:
        """
        Récupère l'URL d'un fichier

        Args:
            object_name: Identifiant du fichier
            is_thumbnail: True si miniature

        Returns:
            URL du fichier
        """
        if not self.service:
            logger.error("Service de stockage non disponible")
            return None

        try:
            if self.backend == 'minio':
                info = self.service.get_file_info(object_name, is_thumbnail)
                return info.get('url') if info else None
            elif self.backend == 'cloudinary':
                return self.service.CloudinaryImage(object_name).build_url()
        except Exception as e:
            logger.error(f"❌ Erreur récupération URL: {e}")
            return None

    def get_file(self, object_name: str, is_thumbnail: bool = False) -> Optional[bytes]:
        """
        Récupère le contenu d'un fichier

        Args:
            object_name: Identifiant du fichier
            is_thumbnail: True si miniature

        Returns:
            Contenu du fichier en bytes
        """
        if not self.service:
            logger.error("Service de stockage non disponible")
            return None

        try:
            if self.backend == 'minio':
                return self.service.get_file(object_name, is_thumbnail)
            elif self.backend == 'cloudinary':
                # Pour Cloudinary, il faudrait télécharger depuis l'URL
                import requests
                url = self.get_file_url(object_name, is_thumbnail)
                if url:
                    response = requests.get(url)
                    return response.content if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"❌ Erreur récupération fichier: {e}")
            return None


# Instance globale de l'adaptateur
storage_adapter = StorageAdapter()
