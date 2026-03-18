"""
Service MinIO pour le stockage des scans
Gère l'upload et le téléchargement des images scannées
"""
import os
import logging
from typing import Optional, List
from datetime import timedelta
from minio import Minio
from minio.error import S3Error

logger = logging.getLogger(__name__)


class MinIOScannerService:
    """
    Service de stockage MinIO pour les scans
    """
    
    def __init__(self):
        self.endpoint = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
        self.access_key = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
        self.secret_key = os.getenv('MINIO_SECRET_KEY', 'minioadmin123')
        self.secure = os.getenv('MINIO_SECURE', 'false').lower() == 'true'
        
        # Buckets
        self.scans_bucket = 'archiflow-scans'
        self.scans_processed_bucket = 'archiflow-scans-processed'
        
        # Créer le client MinIO
        try:
            self.client = Minio(
                self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.secure
            )
            
            # Créer les buckets s'ils n'existent pas
            self._ensure_buckets_exist()
            
            logger.info("MinIO Scanner Service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize MinIO client: {e}")
            self.client = None
    
    def _ensure_buckets_exist(self):
        """Crée les buckets s'ils n'existent pas"""
        try:
            for bucket in [self.scans_bucket, self.scans_processed_bucket]:
                if not self.client.bucket_exists(bucket):
                    self.client.make_bucket(bucket)
                    logger.info(f"Created bucket: {bucket}")
        except S3Error as e:
            logger.error(f"Failed to create buckets: {e}")
    
    def upload_scan(self, file_path: str, object_name: str, 
                   bucket: Optional[str] = None) -> bool:
        """
        Upload un fichier scanné vers MinIO
        
        Args:
            file_path: Chemin du fichier local
            object_name: Nom de l'objet dans MinIO
            bucket: Bucket de destination (par défaut: scans_bucket)
            
        Returns:
            True si l'upload a réussi
        """
        if not self.client:
            logger.error("MinIO client not initialized")
            return False
        
        bucket = bucket or self.scans_bucket
        
        try:
            # Déterminer le content type
            content_type = self._get_content_type(file_path)
            
            # Upload le fichier
            self.client.fput_object(
                bucket,
                object_name,
                file_path,
                content_type=content_type
            )
            
            logger.info(f"Uploaded {file_path} to {bucket}/{object_name}")
            return True
            
        except S3Error as e:
            logger.error(f"Failed to upload {file_path}: {e}")
            return False
    
    def upload_processed_scan(self, file_path: str, object_name: str) -> bool:
        """
        Upload un scan traité vers MinIO
        
        Args:
            file_path: Chemin du fichier local
            object_name: Nom de l'objet dans MinIO
            
        Returns:
            True si l'upload a réussi
        """
        return self.upload_scan(file_path, object_name, self.scans_processed_bucket)
    
    def download_scan(self, object_name: str, file_path: str, 
                     bucket: Optional[str] = None) -> bool:
        """
        Télécharge un scan depuis MinIO
        
        Args:
            object_name: Nom de l'objet dans MinIO
            file_path: Chemin de destination local
            bucket: Bucket source (par défaut: scans_bucket)
            
        Returns:
            True si le téléchargement a réussi
        """
        if not self.client:
            logger.error("MinIO client not initialized")
            return False
        
        bucket = bucket or self.scans_bucket
        
        try:
            self.client.fget_object(bucket, object_name, file_path)
            logger.info(f"Downloaded {bucket}/{object_name} to {file_path}")
            return True
            
        except S3Error as e:
            logger.error(f"Failed to download {object_name}: {e}")
            return False
    
    def get_scan_url(self, object_name: str, bucket: Optional[str] = None,
                    expires: int = 3600) -> Optional[str]:
        """
        Génère une URL présignée pour accéder à un scan
        
        Args:
            object_name: Nom de l'objet dans MinIO
            bucket: Bucket (par défaut: scans_bucket)
            expires: Durée de validité en secondes (par défaut: 1h)
            
        Returns:
            URL présignée ou None
        """
        if not self.client:
            logger.error("MinIO client not initialized")
            return None
        
        bucket = bucket or self.scans_bucket
        
        try:
            url = self.client.presigned_get_object(
                bucket,
                object_name,
                expires=timedelta(seconds=expires)
            )
            return url
            
        except S3Error as e:
            logger.error(f"Failed to generate URL for {object_name}: {e}")
            return None
    
    def delete_scan(self, object_name: str, bucket: Optional[str] = None) -> bool:
        """
        Supprime un scan de MinIO
        
        Args:
            object_name: Nom de l'objet dans MinIO
            bucket: Bucket (par défaut: scans_bucket)
            
        Returns:
            True si la suppression a réussi
        """
        if not self.client:
            logger.error("MinIO client not initialized")
            return False
        
        bucket = bucket or self.scans_bucket
        
        try:
            self.client.remove_object(bucket, object_name)
            logger.info(f"Deleted {bucket}/{object_name}")
            return True
            
        except S3Error as e:
            logger.error(f"Failed to delete {object_name}: {e}")
            return False
    
    def list_scans(self, prefix: str = '', bucket: Optional[str] = None) -> List[str]:
        """
        Liste les scans dans MinIO
        
        Args:
            prefix: Préfixe pour filtrer les objets
            bucket: Bucket (par défaut: scans_bucket)
            
        Returns:
            Liste des noms d'objets
        """
        if not self.client:
            logger.error("MinIO client not initialized")
            return []
        
        bucket = bucket or self.scans_bucket
        
        try:
            objects = self.client.list_objects(bucket, prefix=prefix)
            return [obj.object_name for obj in objects]
            
        except S3Error as e:
            logger.error(f"Failed to list objects: {e}")
            return []
    
    def get_scan_info(self, object_name: str, bucket: Optional[str] = None) -> Optional[dict]:
        """
        Récupère les informations d'un scan
        
        Args:
            object_name: Nom de l'objet dans MinIO
            bucket: Bucket (par défaut: scans_bucket)
            
        Returns:
            Dictionnaire d'informations ou None
        """
        if not self.client:
            logger.error("MinIO client not initialized")
            return None
        
        bucket = bucket or self.scans_bucket
        
        try:
            stat = self.client.stat_object(bucket, object_name)
            return {
                'object_name': stat.object_name,
                'size': stat.size,
                'etag': stat.etag,
                'content_type': stat.content_type,
                'last_modified': stat.last_modified.isoformat() if stat.last_modified else None,
                'metadata': stat.metadata
            }
            
        except S3Error as e:
            logger.error(f"Failed to get info for {object_name}: {e}")
            return None
    
    def upload_batch(self, file_paths: List[str], prefix: str = '') -> List[str]:
        """
        Upload plusieurs fichiers en batch
        
        Args:
            file_paths: Liste des chemins de fichiers
            prefix: Préfixe pour les noms d'objets
            
        Returns:
            Liste des noms d'objets uploadés
        """
        uploaded = []
        
        for file_path in file_paths:
            filename = os.path.basename(file_path)
            object_name = f"{prefix}/{filename}" if prefix else filename
            
            if self.upload_scan(file_path, object_name):
                uploaded.append(object_name)
        
        logger.info(f"Batch upload: {len(uploaded)}/{len(file_paths)} files uploaded")
        return uploaded
    
    def _get_content_type(self, file_path: str) -> str:
        """Détermine le content type d'un fichier"""
        ext = os.path.splitext(file_path)[1].lower()
        
        content_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
            '.pdf': 'application/pdf'
        }
        
        return content_types.get(ext, 'application/octet-stream')
    
    def create_scan_path(self, task_id: str, page_number: int, 
                        processed: bool = False) -> str:
        """
        Crée un chemin d'objet pour un scan
        
        Args:
            task_id: ID de la tâche
            page_number: Numéro de page
            processed: Si True, utilise le bucket des scans traités
            
        Returns:
            Chemin de l'objet
        """
        prefix = 'processed' if processed else 'original'
        return f"scans/{task_id}/{prefix}/page_{page_number:03d}.jpg"


# Instance singleton
_minio_scanner_service = None

def get_minio_scanner_service() -> MinIOScannerService:
    """Retourne l'instance singleton du service"""
    global _minio_scanner_service
    if _minio_scanner_service is None:
        _minio_scanner_service = MinIOScannerService()
    return _minio_scanner_service
