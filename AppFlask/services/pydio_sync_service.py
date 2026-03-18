"""
Service de synchronisation Pydio Cells - ArchiFlow
Gère la synchronisation automatique des documents entre les deux systèmes
"""

import logging
import os
import requests
from datetime import datetime
from typing import Optional, Dict, Any, List

from AppFlask.db import db_connection
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


class PydioSyncService:
    """Service de synchronisation entre Pydio Cells et ArchiFlow"""
    
    # Configuration Pydio Cells
    PYDIO_BASE_URL = os.environ.get('PYDIO_CELLS_URL', 'http://pydio_cells:8080')
    PYDIO_API_TOKEN = os.environ.get('PYDIO_API_TOKEN', 'archiflow_pydio_api_token_2024')
    
    @classmethod
    def sync_document_to_pydio(cls, document_id: int, workspace: str = 'Common Files') -> Dict[str, Any]:
        """
        Synchronise un document ArchiFlow vers Pydio Cells
        
        Args:
            document_id: ID du document dans ArchiFlow
            workspace: Workspace Pydio cible
            
        Returns:
            Dict avec le résultat de la synchronisation
        """
        try:
            conn = db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            try:
                # Récupérer les informations du document
                cursor.execute("""
                    SELECT 
                        d.id, d.titre, d.description, d.type_document,
                        d.chemin_fichier, d.taille, d.date_creation,
                        d.metadata, d.ocr_text,
                        u.nom as auteur_nom, u.prenom as auteur_prenom
                    FROM document d
                    LEFT JOIN utilisateur u ON d.auteur_id = u.id
                    WHERE d.id = %s
                """, (document_id,))
                
                doc = cursor.fetchone()
                
                if not doc:
                    return {'success': False, 'error': 'Document not found'}
                
                # Créer ou mettre à jour l'entrée de synchronisation
                cursor.execute("""
                    INSERT INTO pydio_document_sync (
                        pydio_node_id, name, path, mime_type, size,
                        workspace, metadata, archiflow_document_id, sync_status, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, 'pending', NOW()
                    )
                    ON CONFLICT (pydio_node_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        path = EXCLUDED.path,
                        size = EXCLUDED.size,
                        metadata = EXCLUDED.metadata,
                        sync_status = 'pending',
                        updated_at = NOW()
                    RETURNING id
                """, (
                    f"archiflow-doc-{document_id}",
                    doc['titre'],
                    f"/{workspace}/{doc['type_document'] or 'Documents'}/",
                    cls._get_mime_type(doc['chemin_fichier']),
                    doc['taille'] or 0,
                    workspace,
                    str({
                        'archiflow_id': document_id,
                        'description': doc['description'],
                        'auteur': f"{doc['auteur_prenom']} {doc['auteur_nom']}",
                        'ocr_available': bool(doc['ocr_text'])
                    }),
                    document_id
                ))
                
                sync_id = cursor.fetchone()['id']
                conn.commit()
                
                logger.info(f"✅ Document {document_id} préparé pour sync Pydio (sync_id: {sync_id})")
                
                return {
                    'success': True,
                    'sync_id': sync_id,
                    'document_id': document_id,
                    'status': 'pending'
                }
                
            finally:
                cursor.close()
                conn.close()
                
        except Exception as e:
            logger.error(f"❌ Erreur sync document vers Pydio: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def sync_document_from_pydio(cls, pydio_node_id: str, pydio_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synchronise un document depuis Pydio Cells vers ArchiFlow
        
        Args:
            pydio_node_id: ID du node dans Pydio
            pydio_data: Données du document Pydio
            
        Returns:
            Dict avec le résultat de la synchronisation
        """
        try:
            conn = db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            try:
                # Vérifier si le document existe déjà
                cursor.execute("""
                    SELECT id, archiflow_document_id FROM pydio_document_sync
                    WHERE pydio_node_id = %s
                """, (pydio_node_id,))
                
                existing = cursor.fetchone()
                
                if existing and existing['archiflow_document_id']:
                    # Mettre à jour le document existant
                    cursor.execute("""
                        UPDATE document SET
                            titre = %s,
                            description = %s,
                            date_modification = NOW()
                        WHERE id = %s
                    """, (
                        pydio_data.get('name'),
                        pydio_data.get('description', ''),
                        existing['archiflow_document_id']
                    ))
                    action = 'updated'
                    archiflow_doc_id = existing['archiflow_document_id']
                else:
                    # Créer un nouveau document
                    cursor.execute("""
                        INSERT INTO document (
                            titre, description, type_document,
                            chemin_fichier, taille, date_creation, statut
                        ) VALUES (%s, %s, %s, %s, %s, NOW(), 'actif')
                        RETURNING id
                    """, (
                        pydio_data.get('name'),
                        pydio_data.get('description', ''),
                        pydio_data.get('type', 'Document'),
                        pydio_data.get('path', ''),
                        pydio_data.get('size', 0)
                    ))
                    archiflow_doc_id = cursor.fetchone()['id']
                    action = 'created'
                
                # Mettre à jour la table de sync
                cursor.execute("""
                    INSERT INTO pydio_document_sync (
                        pydio_node_id, name, path, mime_type, size,
                        workspace, metadata, archiflow_document_id, sync_status, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'synced', NOW())
                    ON CONFLICT (pydio_node_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        path = EXCLUDED.path,
                        size = EXCLUDED.size,
                        archiflow_document_id = EXCLUDED.archiflow_document_id,
                        sync_status = 'synced',
                        updated_at = NOW()
                """, (
                    pydio_node_id,
                    pydio_data.get('name'),
                    pydio_data.get('path', '/'),
                    pydio_data.get('mime_type', 'application/octet-stream'),
                    pydio_data.get('size', 0),
                    pydio_data.get('workspace', 'Common Files'),
                    str(pydio_data.get('metadata', {})),
                    archiflow_doc_id
                ))
                
                conn.commit()
                
                logger.info(f"✅ Document Pydio {pydio_node_id} synchronisé ({action})")
                
                return {
                    'success': True,
                    'action': action,
                    'archiflow_document_id': archiflow_doc_id,
                    'pydio_node_id': pydio_node_id
                }
                
            finally:
                cursor.close()
                conn.close()
                
        except Exception as e:
            logger.error(f"❌ Erreur sync document depuis Pydio: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def get_sync_status(cls, document_id: Optional[int] = None, pydio_node_id: Optional[str] = None) -> Dict[str, Any]:
        """Obtenir le statut de synchronisation d'un document"""
        try:
            conn = db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            try:
                if document_id:
                    cursor.execute("""
                        SELECT * FROM pydio_document_sync
                        WHERE archiflow_document_id = %s
                    """, (document_id,))
                elif pydio_node_id:
                    cursor.execute("""
                        SELECT * FROM pydio_document_sync
                        WHERE pydio_node_id = %s
                    """, (pydio_node_id,))
                else:
                    return {'success': False, 'error': 'document_id or pydio_node_id required'}
                
                sync = cursor.fetchone()
                
                if not sync:
                    return {'success': True, 'synced': False, 'data': None}
                
                return {'success': True, 'synced': True, 'data': sync}
                
            finally:
                cursor.close()
                conn.close()
                
        except Exception as e:
            logger.error(f"❌ Erreur récupération statut sync: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def get_pending_syncs(cls, limit: int = 50) -> List[Dict[str, Any]]:
        """Récupérer les synchronisations en attente"""
        try:
            conn = db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            try:
                cursor.execute("""
                    SELECT * FROM pydio_document_sync
                    WHERE sync_status = 'pending'
                    ORDER BY created_at ASC
                    LIMIT %s
                """, (limit,))
                
                return cursor.fetchall()
                
            finally:
                cursor.close()
                conn.close()
                
        except Exception as e:
            logger.error(f"❌ Erreur récupération syncs en attente: {str(e)}")
            return []
    
    @classmethod
    def process_archive_request(cls, request_id: int, action: str, processed_by: int, reason: Optional[str] = None) -> Dict[str, Any]:
        """
        Traiter une demande d'archivage Pydio
        
        Args:
            request_id: ID de la demande
            action: 'approve' ou 'reject'
            processed_by: ID de l'utilisateur qui traite
            reason: Raison du rejet (si applicable)
        """
        try:
            conn = db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            try:
                # Récupérer la demande
                cursor.execute("""
                    SELECT * FROM pydio_archive_request WHERE id = %s
                """, (request_id,))
                
                req = cursor.fetchone()
                
                if not req:
                    return {'success': False, 'error': 'Request not found'}
                
                if req['status'] != 'pending':
                    return {'success': False, 'error': f"Request already {req['status']}"}
                
                if action == 'approve':
                    # Créer le document dans ArchiFlow
                    cursor.execute("""
                        INSERT INTO document (
                            titre, description, type_document,
                            chemin_fichier, date_creation, statut, auteur_id
                        ) VALUES (%s, %s, 'Archive Pydio', %s, NOW(), 'archivé', %s)
                        RETURNING id
                    """, (
                        req['document_name'],
                        f"Archivé depuis Pydio - Workspace: {req['workspace']} - Path: {req['path']}",
                        req['path'] + req['document_name'],
                        processed_by
                    ))
                    
                    archiflow_doc_id = cursor.fetchone()['id']
                    
                    # Mettre à jour la demande
                    cursor.execute("""
                        UPDATE pydio_archive_request SET
                            status = 'completed',
                            archiflow_document_id = %s,
                            processed_by = %s,
                            processed_at = NOW(),
                            updated_at = NOW()
                        WHERE id = %s
                    """, (archiflow_doc_id, processed_by, request_id))
                    
                    new_status = 'completed'
                    
                elif action == 'reject':
                    cursor.execute("""
                        UPDATE pydio_archive_request SET
                            status = 'rejected',
                            processed_by = %s,
                            processed_at = NOW(),
                            rejection_reason = %s,
                            updated_at = NOW()
                        WHERE id = %s
                    """, (processed_by, reason, request_id))
                    
                    new_status = 'rejected'
                    archiflow_doc_id = None
                else:
                    return {'success': False, 'error': 'Invalid action. Use approve or reject'}
                
                conn.commit()
                
                logger.info(f"✅ Demande archivage {request_id} traitée: {new_status}")
                
                return {
                    'success': True,
                    'request_id': request_id,
                    'status': new_status,
                    'archiflow_document_id': archiflow_doc_id
                }
                
            finally:
                cursor.close()
                conn.close()
                
        except Exception as e:
            logger.error(f"❌ Erreur traitement demande archivage: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def get_archive_requests_stats(cls) -> Dict[str, Any]:
        """Obtenir les statistiques des demandes d'archivage"""
        try:
            conn = db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            try:
                stats = {}
                
                # Par statut
                cursor.execute("""
                    SELECT status, COUNT(*) as count
                    FROM pydio_archive_request
                    GROUP BY status
                """)
                stats['by_status'] = {row['status']: row['count'] for row in cursor.fetchall()}
                
                # Total
                cursor.execute("SELECT COUNT(*) as total FROM pydio_archive_request")
                stats['total'] = cursor.fetchone()['total']
                
                # Dernières 24h
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM pydio_archive_request
                    WHERE created_at > NOW() - INTERVAL '24 hours'
                """)
                stats['last_24h'] = cursor.fetchone()['count']
                
                # Par workspace
                cursor.execute("""
                    SELECT workspace, COUNT(*) as count
                    FROM pydio_archive_request
                    GROUP BY workspace
                    ORDER BY count DESC
                    LIMIT 5
                """)
                stats['by_workspace'] = {row['workspace']: row['count'] for row in cursor.fetchall()}
                
                return {'success': True, 'stats': stats}
                
            finally:
                cursor.close()
                conn.close()
                
        except Exception as e:
            logger.error(f"❌ Erreur stats demandes archivage: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def _get_mime_type(filename: Optional[str]) -> str:
        """Déterminer le type MIME d'un fichier"""
        if not filename:
            return 'application/octet-stream'
        
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        
        mime_types = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'csv': 'text/csv',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed'
        }
        
        return mime_types.get(ext, 'application/octet-stream')


# Instance singleton
pydio_sync_service = PydioSyncService()
