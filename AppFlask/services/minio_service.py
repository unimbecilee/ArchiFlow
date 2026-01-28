"""
Service de gestion du stockage MinIO
Remplace Cloudinary pour le stockage des fichiers
"""

import os
import logging
from minio import Minio
from minio.error import S3Error
from datetime import timedelta
from typing import Optional, BinaryIO
import uuid
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class MinioService:
    """Service de gestion du stockage MinIO"""

    def __init__(self):
        """Initialise la connexion MinIO"""
        self.endpoint = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
        self.access_key = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
        self.secret_key = os.getenv('MINIO_SECRET_KEY', 'minioadmin123')
        self.use_ssl = os.getenv('MINIO_USE_SSL', 'false').lower() == 'true'
        self.bucket_documents = os.getenv('MINIO_BUCKET_DOCUMENTS', 'esag-documents')
        self.bucket_thumbnails = os.getenv('MINIO_BUCKET_THUMBNAILS', 'esag-thumbnails')

        try:
            self.client = Minio(
                self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.use_ssl
            )
            logger.info(f"✅ Connexion MinIO établie: {self.endpoint}")
            self._ensure_buckets_exist()
        except Exception as e:
            logger.error(f"❌ Erreur de connexion MinIO: {e}")
            self.client = None

    def _ensure_buckets_exist(self):
        """Vérifie et crée les buckets si nécessaire"""
        if not self.client:
            return

        try:
            # Bucket pour les documents
            if not self.client.bucket_exists(self.bucket_documents):
                self.client.make_bucket(self.bucket_documents)
                logger.info(f"✅ Bucket créé: {self.bucket_documents}")

            # Bucket pour les miniatures
            if not self.client.bucket_exists(self.bucket_thumbnails):
                self.client.make_bucket(self.bucket_thumbnails)
                logger.info(f"✅ Bucket créé: {self.bucket_thumbnails}")

        except S3Error as e:
            logger.error(f"❌ Erreur création buckets: {e}")

    def upload_file(
        self,
        file_data: BinaryIO,
        filename: str,
        content_type: str = 'application/octet-stream',
        is_thumbnail: bool = False
    ) -> Optional[dict]:
        """
        Upload un fichier vers MinIO

        Args:
            file_data: Données du fichier (file object ou bytes)
            filename: Nom du fichier
            content_type: Type MIME du fichier
            is_thumbnail: True si c'est une miniature

        Returns:
            dict avec url, object_name, bucket ou None en cas d'erreur
        """
        if not self.client:
            logger.error("Client MinIO non initialisé")
            return None

        try:
            # Générer un nom unique pour le fichier
            secure_name = secure_filename(filename)
            extension = os.path.splitext(secure_name)[1]
            unique_name = f"{uuid.uuid4().hex}{extension}"

            # Choisir le bucket
            bucket = self.bucket_thumbnails if is_thumbnail else self.bucket_documents

            # Déterminer la taille du fichier
            file_data.seek(0, os.SEEK_END)
            file_size = file_data.tell()
            file_data.seek(0)

            # Upload vers MinIO
            self.client.put_object(
                bucket,
                unique_name,
                file_data,
                file_size,
                content_type=content_type
            )

            # Générer l'URL d'accès
            url = self._get_file_url(bucket, unique_name)

            logger.info(f"✅ Fichier uploadé: {unique_name} ({file_size} bytes)")

            return {
                'url': url,
                'object_name': unique_name,
                'bucket': bucket,
                'size': file_size,
                'content_type': content_type
            }

        except S3Error as e:
            logger.error(f"❌ Erreur upload MinIO: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Erreur inattendue upload: {e}")
            return None

    def delete_file(self, object_name: str, is_thumbnail: bool = False) -> bool:
        """
        Supprime un fichier de MinIO

        Args:
            object_name: Nom de l'objet dans MinIO
            is_thumbnail: True si c'est une miniature

        Returns:
            True si succès, False sinon
        """
        if not self.client:
            logger.error("Client MinIO non initialisé")
            return False

        try:
            bucket = self.bucket_thumbnails if is_thumbnail else self.bucket_documents
            self.client.remove_object(bucket, object_name)
            logger.info(f"✅ Fichier supprimé: {object_name}")
            return True

        except S3Error as e:
            logger.error(f"❌ Erreur suppression MinIO: {e}")
            return False

    def get_file(self, object_name: str, is_thumbnail: bool = False) -> Optional[bytes]:
        """
        Récupère un fichier depuis MinIO

        Args:
            object_name: Nom de l'objet dans MinIO
            is_thumbnail: True si c'est une miniature

        Returns:
            Contenu du fichier en bytes ou None
        """
        if not self.client:
            logger.error("Client MinIO non initialisé")
            return None

        try:
            bucket = self.bucket_thumbnails if is_thumbnail else self.bucket_documents
            response = self.client.get_object(bucket, object_name)
            data = response.read()
            response.close()
            response.release_conn()
            return data

        except S3Error as e:
            logger.error(f"❌ Erreur récupération MinIO: {e}")
            return None

    def get_presigned_url(
        self,
        object_name: str,
        is_thumbnail: bool = False,
        expires: timedelta = timedelta(hours=1)
    ) -> Optional[str]:
        """
        Génère une URL pré-signée pour accès temporaire

        Args:
            object_name: Nom de l'objet dans MinIO
            is_thumbnail: True si c'est une miniature
            expires: Durée de validité de l'URL

        Returns:
            URL pré-signée ou None
        """
        if not self.client:
            logger.error("Client MinIO non initialisé")
            return None

        try:
            bucket = self.bucket_thumbnails if is_thumbnail else self.bucket_documents
            url = self.client.presigned_get_object(bucket, object_name, expires=expires)
            return url

        except S3Error as e:
            logger.error(f"❌ Erreur génération URL pré-signée: {e}")
            return None

    def _get_file_url(self, bucket: str, object_name: str) -> str:
        """
        Génère l'URL publique d'un fichier

        Args:
            bucket: Nom du bucket
            object_name: Nom de l'objet

        Returns:
            URL publique du fichier
        """
        protocol = 'https' if self.use_ssl else 'http'
        return f"{protocol}://{self.endpoint}/{bucket}/{object_name}"

    def list_files(self, prefix: str = '', is_thumbnail: bool = False) -> list:
        """
        Liste les fichiers dans un bucket

        Args:
            prefix: Préfixe pour filtrer les fichiers
            is_thumbnail: True si c'est une miniature

        Returns:
            Liste des objets
        """
        if not self.client:
            logger.error("Client MinIO non initialisé")
            return []

        try:
            bucket = self.bucket_thumbnails if is_thumbnail else self.bucket_documents
            objects = self.client.list_objects(bucket, prefix=prefix)
            return [
                {
                    'object_name': obj.object_name,
                    'size': obj.size,
                    'last_modified': obj.last_modified,
                    'url': self._get_file_url(bucket, obj.object_name)
                }
                for obj in objects
            ]

        except S3Error as e:
            logger.error(f"❌ Erreur listage MinIO: {e}")
            return []

    def get_file_info(self, object_name: str, is_thumbnail: bool = False) -> Optional[dict]:
        """
        Récupère les informations d'un fichier

        Args:
            object_name: Nom de l'objet dans MinIO
            is_thumbnail: True si c'est une miniature

        Returns:
            Informations du fichier ou None
        """
        if not self.client:
            logger.error("Client MinIO non initialisé")
            return None

        try:
            bucket = self.bucket_thumbnails if is_thumbnail else self.bucket_documents
            stat = self.client.stat_object(bucket, object_name)
            return {
                'object_name': object_name,
                'size': stat.size,
                'content_type': stat.content_type,
                'last_modified': stat.last_modified,
                'etag': stat.etag,
                'url': self._get_file_url(bucket, object_name)
            }

        except S3Error as e:
            logger.error(f"❌ Erreur stat MinIO: {e}")
            return None


# Instance globale du service
minio_service = MinioService()
