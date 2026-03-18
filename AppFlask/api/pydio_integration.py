"""
API d'intégration Pydio Cells - ArchiFlow
Permet la communication bidirectionnelle entre Pydio Cells et le backend ArchiFlow
"""

from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import logging
import hmac
import hashlib
import os
from datetime import datetime

from AppFlask.db import db_connection
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

bp = Blueprint('pydio_integration', __name__)

# Clé secrète pour l'authentification des webhooks Pydio
PYDIO_WEBHOOK_SECRET = os.environ.get('PYDIO_WEBHOOK_SECRET', 'archiflow_pydio_webhook_secret_2024')


def verify_pydio_signature(f):
    """Décorateur pour vérifier la signature des webhooks Pydio"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # En mode développement, on peut désactiver la vérification
        if os.environ.get('PYDIO_SKIP_SIGNATURE_CHECK', 'false').lower() == 'true':
            return f(*args, **kwargs)
        
        signature = request.headers.get('X-Pydio-Signature')
        if not signature:
            # Si pas de signature, vérifier le token API
            api_token = request.headers.get('X-Pydio-Token')
            expected_token = os.environ.get('PYDIO_API_TOKEN', 'archiflow_pydio_api_token_2024')
            if api_token != expected_token:
                logger.warning("Requête Pydio sans signature ni token valide")
                return jsonify({'error': 'Unauthorized', 'message': 'Invalid or missing authentication'}), 401
        else:
            # Vérifier la signature HMAC
            payload = request.get_data()
            expected_signature = hmac.new(
                PYDIO_WEBHOOK_SECRET.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                logger.warning("Signature Pydio invalide")
                return jsonify({'error': 'Unauthorized', 'message': 'Invalid signature'}), 401
        
        return f(*args, **kwargs)
    return decorated_function


# ============================================================================
# ENDPOINTS D'ARCHIVAGE
# ============================================================================

@bp.route('/api/v1/pydio/archive-requests', methods=['POST'])
@verify_pydio_signature
def create_archive_request():
    """
    Créer une demande d'archivage depuis Pydio Cells
    
    Payload attendu:
    {
        "document_id": "uuid-pydio",
        "document_name": "facture_2024.pdf",
        "workspace": "Common Files",
        "path": "/Factures/2024/",
        "user": "admin",
        "user_email": "admin@archiflow.com",
        "metadata": {
            "type": "facture",
            "date": "2024-03-18",
            "size": 1024000
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Bad Request', 'message': 'JSON payload required'}), 400
        
        # Validation des champs requis
        required_fields = ['document_id', 'document_name', 'user']
        missing_fields = [f for f in required_fields if not data.get(f)]
        if missing_fields:
            return jsonify({
                'error': 'Bad Request',
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Chercher l'utilisateur ArchiFlow correspondant
            cursor.execute("""
                SELECT id, nom, prenom, email, role
                FROM utilisateur
                WHERE email = %s OR nom = %s
                LIMIT 1
            """, (data.get('user_email', ''), data.get('user', '')))
            
            user = cursor.fetchone()
            
            if not user:
                # Créer un utilisateur temporaire ou utiliser un compte système
                logger.warning(f"Utilisateur Pydio non trouvé: {data.get('user')}")
                user_id = 1  # Utiliser l'admin par défaut
            else:
                user_id = user['id']
            
            # Insérer la demande d'archivage Pydio
            cursor.execute("""
                INSERT INTO pydio_archive_request (
                    pydio_document_id,
                    document_name,
                    workspace,
                    path,
                    pydio_user,
                    user_email,
                    metadata,
                    status,
                    created_by,
                    created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s, NOW())
                RETURNING id, created_at
            """, (
                data.get('document_id'),
                data.get('document_name'),
                data.get('workspace', 'Common Files'),
                data.get('path', '/'),
                data.get('user'),
                data.get('user_email'),
                str(data.get('metadata', {})),
                user_id
            ))
            
            result = cursor.fetchone()
            conn.commit()
            
            # Envoyer une notification aux responsables d'archivage
            from AppFlask.services.notification_service import NotificationService
            
            # Notifier les archivistes
            cursor.execute("""
                SELECT id FROM utilisateur 
                WHERE role IN ('Archiviste', 'Administrateur', 'Chef de service')
            """)
            responsables = cursor.fetchall()
            
            for resp in responsables:
                NotificationService.create_notification(
                    user_id=resp['id'],
                    title="Nouvelle demande d'archivage Pydio",
                    message=f"Document: {data.get('document_name')} - Demandé par: {data.get('user')}",
                    notification_type='PYDIO_ARCHIVE_REQUEST',
                    priority=3,
                    action_url=f"/admin/pydio-archives/{result['id']}"
                )
            
            logger.info(f"✅ Demande d'archivage Pydio créée: {result['id']}")
            
            return jsonify({
                'success': True,
                'message': 'Archive request created successfully',
                'request_id': result['id'],
                'created_at': result['created_at'].isoformat() if result['created_at'] else None
            }), 201
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"❌ Erreur création demande archivage Pydio: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': str(e)
        }), 500


@bp.route('/api/v1/pydio/archive-requests', methods=['GET'])
@verify_pydio_signature
def list_archive_requests():
    """Lister les demandes d'archivage depuis Pydio"""
    try:
        status = request.args.get('status', None)
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = int(request.args.get('offset', 0))
        
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            query = """
                SELECT 
                    id, pydio_document_id, document_name, workspace, path,
                    pydio_user, user_email, metadata, status,
                    created_at, updated_at, processed_at
                FROM pydio_archive_request
            """
            params = []
            
            if status:
                query += " WHERE status = %s"
                params.append(status)
            
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            requests = cursor.fetchall()
            
            # Compter le total
            count_query = "SELECT COUNT(*) FROM pydio_archive_request"
            if status:
                count_query += " WHERE status = %s"
                cursor.execute(count_query, [status] if status else [])
            else:
                cursor.execute(count_query)
            
            total = cursor.fetchone()['count']
            
            return jsonify({
                'success': True,
                'data': requests,
                'pagination': {
                    'total': total,
                    'limit': limit,
                    'offset': offset
                }
            }), 200
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"❌ Erreur liste demandes archivage: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


@bp.route('/api/v1/pydio/archive-requests/<int:request_id>', methods=['GET'])
@verify_pydio_signature
def get_archive_request(request_id):
    """Obtenir le détail d'une demande d'archivage"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT * FROM pydio_archive_request WHERE id = %s
            """, (request_id,))
            
            req = cursor.fetchone()
            
            if not req:
                return jsonify({'error': 'Not Found', 'message': 'Archive request not found'}), 404
            
            return jsonify({'success': True, 'data': req}), 200
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"❌ Erreur récupération demande archivage: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


@bp.route('/api/v1/pydio/archive-requests/<int:request_id>/status', methods=['PUT'])
@verify_pydio_signature
def update_archive_request_status(request_id):
    """Mettre à jour le statut d'une demande d'archivage"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        valid_statuses = ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed']
        if new_status not in valid_statuses:
            return jsonify({
                'error': 'Bad Request',
                'message': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
            }), 400
        
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("""
                UPDATE pydio_archive_request
                SET status = %s, updated_at = NOW(),
                    processed_at = CASE WHEN %s IN ('completed', 'failed') THEN NOW() ELSE processed_at END
                WHERE id = %s
                RETURNING id, status, updated_at
            """, (new_status, new_status, request_id))
            
            result = cursor.fetchone()
            
            if not result:
                return jsonify({'error': 'Not Found', 'message': 'Archive request not found'}), 404
            
            conn.commit()
            
            logger.info(f"✅ Statut demande archivage {request_id} mis à jour: {new_status}")
            
            return jsonify({
                'success': True,
                'message': 'Status updated successfully',
                'data': result
            }), 200
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"❌ Erreur mise à jour statut: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


# ============================================================================
# ENDPOINTS DE SYNCHRONISATION DOCUMENTS
# ============================================================================

@bp.route('/api/v1/pydio/documents/sync', methods=['POST'])
@verify_pydio_signature
def sync_document_from_pydio():
    """
    Synchroniser un document depuis Pydio vers ArchiFlow
    Utilisé quand un document est créé/modifié dans Pydio et doit être référencé dans ArchiFlow
    """
    try:
        data = request.get_json()
        
        required_fields = ['pydio_node_id', 'name', 'path', 'mime_type']
        missing_fields = [f for f in required_fields if not data.get(f)]
        if missing_fields:
            return jsonify({
                'error': 'Bad Request',
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Vérifier si le document existe déjà
            cursor.execute("""
                SELECT id FROM pydio_document_sync
                WHERE pydio_node_id = %s
            """, (data.get('pydio_node_id'),))
            
            existing = cursor.fetchone()
            
            if existing:
                # Mettre à jour
                cursor.execute("""
                    UPDATE pydio_document_sync
                    SET name = %s, path = %s, mime_type = %s, size = %s,
                        workspace = %s, metadata = %s, updated_at = NOW()
                    WHERE pydio_node_id = %s
                    RETURNING id
                """, (
                    data.get('name'),
                    data.get('path'),
                    data.get('mime_type'),
                    data.get('size', 0),
                    data.get('workspace', 'Common Files'),
                    str(data.get('metadata', {})),
                    data.get('pydio_node_id')
                ))
                action = 'updated'
            else:
                # Créer
                cursor.execute("""
                    INSERT INTO pydio_document_sync (
                        pydio_node_id, name, path, mime_type, size,
                        workspace, metadata, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    RETURNING id
                """, (
                    data.get('pydio_node_id'),
                    data.get('name'),
                    data.get('path'),
                    data.get('mime_type'),
                    data.get('size', 0),
                    data.get('workspace', 'Common Files'),
                    str(data.get('metadata', {}))
                ))
                action = 'created'
            
            result = cursor.fetchone()
            conn.commit()
            
            logger.info(f"✅ Document Pydio synchronisé ({action}): {data.get('name')}")
            
            return jsonify({
                'success': True,
                'message': f'Document {action} successfully',
                'sync_id': result['id'],
                'action': action
            }), 201 if action == 'created' else 200
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"❌ Erreur synchronisation document Pydio: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


@bp.route('/api/v1/pydio/documents/sync/<pydio_node_id>', methods=['DELETE'])
@verify_pydio_signature
def delete_synced_document(pydio_node_id):
    """Supprimer la référence d'un document synchronisé (quand supprimé dans Pydio)"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("""
                DELETE FROM pydio_document_sync
                WHERE pydio_node_id = %s
                RETURNING id, name
            """, (pydio_node_id,))
            
            result = cursor.fetchone()
            
            if not result:
                return jsonify({'error': 'Not Found', 'message': 'Synced document not found'}), 404
            
            conn.commit()
            
            logger.info(f"✅ Document Pydio désynchronisé: {result['name']}")
            
            return jsonify({
                'success': True,
                'message': 'Document sync removed successfully'
            }), 200
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"❌ Erreur suppression sync document: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


# ============================================================================
# ENDPOINTS WEBHOOKS PYDIO
# ============================================================================

@bp.route('/api/v1/pydio/webhooks/node-created', methods=['POST'])
@verify_pydio_signature
def webhook_node_created():
    """Webhook appelé quand un fichier/dossier est créé dans Pydio"""
    try:
        data = request.get_json()
        logger.info(f"📥 Webhook Pydio node-created: {data}")
        
        # Traiter l'événement de création
        node_type = data.get('type', 'file')
        node_path = data.get('path', '')
        node_name = data.get('name', '')
        
        # Log l'événement pour audit
        conn = db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO pydio_webhook_log (
                    event_type, node_type, node_path, node_name, payload, created_at
                ) VALUES ('node-created', %s, %s, %s, %s, NOW())
            """, (node_type, node_path, node_name, str(data)))
            conn.commit()
        finally:
            cursor.close()
            conn.close()
        
        return jsonify({'success': True, 'message': 'Webhook processed'}), 200
        
    except Exception as e:
        logger.error(f"❌ Erreur webhook node-created: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


@bp.route('/api/v1/pydio/webhooks/node-deleted', methods=['POST'])
@verify_pydio_signature
def webhook_node_deleted():
    """Webhook appelé quand un fichier/dossier est supprimé dans Pydio"""
    try:
        data = request.get_json()
        logger.info(f"📥 Webhook Pydio node-deleted: {data}")
        
        # Supprimer la synchronisation si elle existe
        pydio_node_id = data.get('node_id')
        if pydio_node_id:
            conn = db_connection()
            cursor = conn.cursor()
            
            try:
                cursor.execute("""
                    DELETE FROM pydio_document_sync WHERE pydio_node_id = %s
                """, (pydio_node_id,))
                
                cursor.execute("""
                    INSERT INTO pydio_webhook_log (
                        event_type, node_type, node_path, node_name, payload, created_at
                    ) VALUES ('node-deleted', %s, %s, %s, %s, NOW())
                """, (
                    data.get('type', 'file'),
                    data.get('path', ''),
                    data.get('name', ''),
                    str(data)
                ))
                conn.commit()
            finally:
                cursor.close()
                conn.close()
        
        return jsonify({'success': True, 'message': 'Webhook processed'}), 200
        
    except Exception as e:
        logger.error(f"❌ Erreur webhook node-deleted: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


@bp.route('/api/v1/pydio/webhooks/node-updated', methods=['POST'])
@verify_pydio_signature
def webhook_node_updated():
    """Webhook appelé quand un fichier/dossier est modifié dans Pydio"""
    try:
        data = request.get_json()
        logger.info(f"📥 Webhook Pydio node-updated: {data}")
        
        # Log l'événement
        conn = db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO pydio_webhook_log (
                    event_type, node_type, node_path, node_name, payload, created_at
                ) VALUES ('node-updated', %s, %s, %s, %s, NOW())
            """, (
                data.get('type', 'file'),
                data.get('path', ''),
                data.get('name', ''),
                str(data)
            ))
            conn.commit()
        finally:
            cursor.close()
            conn.close()
        
        return jsonify({'success': True, 'message': 'Webhook processed'}), 200
        
    except Exception as e:
        logger.error(f"❌ Erreur webhook node-updated: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


# ============================================================================
# ENDPOINTS HEALTH & STATUS
# ============================================================================

@bp.route('/api/v1/pydio/health', methods=['GET'])
def pydio_integration_health():
    """Vérifier la santé de l'intégration Pydio"""
    try:
        # Vérifier la connexion à la base de données
        conn = db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        
        return jsonify({
            'status': 'healthy',
            'service': 'pydio-integration',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'service': 'pydio-integration',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503


@bp.route('/api/v1/pydio/stats', methods=['GET'])
@verify_pydio_signature
def pydio_integration_stats():
    """Obtenir les statistiques d'intégration Pydio"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            stats = {}
            
            # Compter les demandes d'archivage par statut
            cursor.execute("""
                SELECT status, COUNT(*) as count
                FROM pydio_archive_request
                GROUP BY status
            """)
            archive_stats = cursor.fetchall()
            stats['by_status'] = {row['status']: row['count'] for row in archive_stats}
            
            # Total
            cursor.execute("SELECT COUNT(*) as count FROM pydio_archive_request")
            stats['total'] = cursor.fetchone()['count']
            
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
            
            # Compter les documents synchronisés
            cursor.execute("SELECT COUNT(*) as count FROM pydio_document_sync")
            stats['synced_documents'] = cursor.fetchone()['count']
            
            # Compter les webhooks des dernières 24h
            cursor.execute("""
                SELECT event_type, COUNT(*) as count
                FROM pydio_webhook_log
                WHERE created_at > NOW() - INTERVAL '24 hours'
                GROUP BY event_type
            """)
            webhook_stats = cursor.fetchall()
            stats['webhooks_24h'] = {row['event_type']: row['count'] for row in webhook_stats}
            
            return jsonify({
                'success': True,
                'stats': stats,
                'timestamp': datetime.utcnow().isoformat()
            }), 200
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"❌ Erreur récupération stats: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


# ============================================================================
# ENDPOINTS ADMIN - TRAITEMENT DES DEMANDES
# ============================================================================

@bp.route('/api/v1/pydio/archive-requests/<int:request_id>/process', methods=['POST'])
@verify_pydio_signature
def process_archive_request(request_id):
    """
    Traiter une demande d'archivage (approuver ou rejeter)
    
    Payload:
    {
        "action": "approve" | "reject",
        "processed_by": 1,
        "reason": "Motif du rejet (optionnel)"
    }
    """
    try:
        data = request.get_json()
        action = data.get('action')
        processed_by = data.get('processed_by', 1)
        reason = data.get('reason', '')
        
        if action not in ['approve', 'reject']:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Action must be "approve" or "reject"'
            }), 400
        
        from AppFlask.services.pydio_sync_service import pydio_sync_service
        
        result = pydio_sync_service.process_archive_request(
            request_id=request_id,
            action=action,
            processed_by=processed_by,
            reason=reason
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"❌ Erreur traitement demande: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


@bp.route('/api/v1/pydio/sync/document', methods=['POST'])
@verify_pydio_signature
def sync_document_to_pydio():
    """
    Synchroniser un document ArchiFlow vers Pydio
    
    Payload:
    {
        "document_id": 123,
        "workspace": "Common Files"
    }
    """
    try:
        data = request.get_json()
        document_id = data.get('document_id')
        workspace = data.get('workspace', 'Common Files')
        
        if not document_id:
            return jsonify({
                'error': 'Bad Request',
                'message': 'document_id is required'
            }), 400
        
        from AppFlask.services.pydio_sync_service import pydio_sync_service
        
        result = pydio_sync_service.sync_document_to_pydio(
            document_id=document_id,
            workspace=workspace
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"❌ Erreur sync document: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


@bp.route('/api/v1/pydio/sync/status', methods=['GET'])
@verify_pydio_signature
def get_sync_status():
    """Obtenir le statut de synchronisation d'un document"""
    try:
        document_id = request.args.get('document_id', type=int)
        pydio_node_id = request.args.get('pydio_node_id')
        
        if not document_id and not pydio_node_id:
            return jsonify({
                'error': 'Bad Request',
                'message': 'document_id or pydio_node_id required'
            }), 400
        
        from AppFlask.services.pydio_sync_service import pydio_sync_service
        
        result = pydio_sync_service.get_sync_status(
            document_id=document_id,
            pydio_node_id=pydio_node_id
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ Erreur récupération statut sync: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


@bp.route('/api/v1/pydio/sync/pending', methods=['GET'])
@verify_pydio_signature
def get_pending_syncs():
    """Obtenir les synchronisations en attente"""
    try:
        limit = request.args.get('limit', 50, type=int)
        
        from AppFlask.services.pydio_sync_service import pydio_sync_service
        
        pending = pydio_sync_service.get_pending_syncs(limit=limit)
        
        return jsonify({
            'success': True,
            'data': pending,
            'count': len(pending)
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erreur récupération syncs en attente: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500
