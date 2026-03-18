"""
API REST pour le système de scanner avancé
Endpoints pour la détection, la numérisation et le traitement asynchrone
"""
import os
import uuid
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from functools import wraps

from AppFlask.services.scanner_detection_service import get_scanner_service
from AppFlask.tasks.scan_tasks import detect_scanners_task, perform_scan_task, cancel_scan_task
from AppFlask.tasks.image_processing_tasks import enhance_image_task, batch_enhance_task
from AppFlask.tasks.ocr_tasks import perform_ocr_task, batch_ocr_task
from celery.result import AsyncResult
from AppFlask.celery_app import celery_app

logger = logging.getLogger(__name__)

bp = Blueprint('scanner_api', __name__, url_prefix='/api/scanner')


def token_required(f):
    """Décorateur pour vérifier le token JWT"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # TODO: Implémenter la vérification du token
        # Pour l'instant, simuler un utilisateur
        current_user = {'id': 1, 'email': 'test@archiflow.com'}
        return f(current_user, *args, **kwargs)
    return decorated


@bp.route('/devices', methods=['GET'])
@token_required
def get_scanners(current_user):
    """
    Liste tous les scanners disponibles
    
    Query params:
        - force_refresh: Force la détection (true/false)
        
    Returns:
        Liste des scanners détectés
    """
    try:
        force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
        
        # Lancer la tâche de détection
        task = detect_scanners_task.delay(force_refresh=force_refresh)
        
        # Attendre le résultat (max 10 secondes)
        result = task.get(timeout=10)
        
        return jsonify({
            'success': result['success'],
            'scanners': result['scanners'],
            'count': result['count']
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get scanners: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'scanners': [],
            'count': 0
        }), 500


@bp.route('/devices/<scanner_id>', methods=['GET'])
@token_required
def get_scanner(current_user, scanner_id):
    """
    Récupère les informations d'un scanner spécifique
    
    Args:
        scanner_id: ID du scanner
        
    Returns:
        Informations du scanner
    """
    try:
        scanner_service = get_scanner_service()
        scanner = scanner_service.get_scanner_by_id(scanner_id)
        
        if not scanner:
            return jsonify({
                'success': False,
                'error': 'Scanner not found'
            }), 404
        
        return jsonify({
            'success': True,
            'scanner': scanner
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get scanner {scanner_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/devices/<scanner_id>/test', methods=['POST'])
@token_required
def test_scanner(current_user, scanner_id):
    """
    Teste la connexion à un scanner
    
    Args:
        scanner_id: ID du scanner
        
    Returns:
        Résultat du test
    """
    try:
        scanner_service = get_scanner_service()
        is_available = scanner_service.test_scanner_connection(scanner_id)
        
        return jsonify({
            'success': True,
            'scanner_id': scanner_id,
            'available': is_available
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to test scanner {scanner_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/scan', methods=['POST'])
@token_required
def start_scan(current_user):
    """
    Démarre une tâche de numérisation
    
    Body:
        - scanner_id: ID du scanner
        - settings: Paramètres de numérisation
        
    Returns:
        ID de la tâche créée
    """
    try:
        data = request.get_json()
        
        if not data or 'scanner_id' not in data:
            return jsonify({
                'success': False,
                'error': 'scanner_id is required'
            }), 400
        
        scanner_id = data['scanner_id']
        settings = data.get('settings', {})
        
        # Créer un ID de tâche
        task_id = str(uuid.uuid4())
        
        # Créer la tâche en base de données
        import psycopg2
        from psycopg2.extras import Json
        
        conn = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST', 'localhost'),
            port=int(os.getenv('POSTGRES_PORT', 5432)),
            database=os.getenv('POSTGRES_DB', 'archiflow'),
            user=os.getenv('POSTGRES_USER', 'archiflow_user'),
            password=os.getenv('POSTGRES_PASSWORD', 'archiflow_password_2024')
        )
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO scan_task (id, utilisateur_id, scanner_id, settings, status, created_at)
            VALUES (%s, %s, %s, %s, 'pending', NOW())
        """, (task_id, current_user['id'], scanner_id, Json(settings)))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Lancer la tâche Celery
        celery_task = perform_scan_task.delay(task_id, scanner_id, settings)
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'celery_task_id': celery_task.id,
            'status': 'pending'
        }), 201
        
    except Exception as e:
        logger.error(f"Failed to start scan: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/tasks/<task_id>', methods=['GET'])
@token_required
def get_task_status(current_user, task_id):
    """
    Récupère le statut d'une tâche de numérisation
    
    Args:
        task_id: ID de la tâche
        
    Returns:
        Statut de la tâche
    """
    try:
        import psycopg2
        
        conn = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST', 'localhost'),
            port=int(os.getenv('POSTGRES_PORT', 5432)),
            database=os.getenv('POSTGRES_DB', 'archiflow'),
            user=os.getenv('POSTGRES_USER', 'archiflow_user'),
            password=os.getenv('POSTGRES_PASSWORD', 'archiflow_password_2024')
        )
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, utilisateur_id, scanner_id, settings, status, 
                   created_at, started_at, completed_at, progress, 
                   total_pages, processed_pages, error_message, result_data
            FROM scan_task
            WHERE id = %s AND utilisateur_id = %s
        """, (task_id, current_user['id']))
        
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not row:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        task = {
            'id': row[0],
            'utilisateur_id': row[1],
            'scanner_id': row[2],
            'settings': row[3],
            'status': row[4],
            'created_at': row[5].isoformat() if row[5] else None,
            'started_at': row[6].isoformat() if row[6] else None,
            'completed_at': row[7].isoformat() if row[7] else None,
            'progress': row[8],
            'total_pages': row[9],
            'processed_pages': row[10],
            'error_message': row[11],
            'result_data': row[12]
        }
        
        return jsonify({
            'success': True,
            'task': task
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get task status: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/tasks/<task_id>/cancel', methods=['POST'])
@token_required
def cancel_task(current_user, task_id):
    """
    Annule une tâche de numérisation
    
    Args:
        task_id: ID de la tâche
        
    Returns:
        Résultat de l'annulation
    """
    try:
        # Vérifier que la tâche appartient à l'utilisateur
        import psycopg2
        
        conn = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST', 'localhost'),
            port=int(os.getenv('POSTGRES_PORT', 5432)),
            database=os.getenv('POSTGRES_DB', 'archiflow'),
            user=os.getenv('POSTGRES_USER', 'archiflow_user'),
            password=os.getenv('POSTGRES_PASSWORD', 'archiflow_password_2024')
        )
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id FROM scan_task
            WHERE id = %s AND utilisateur_id = %s
        """, (task_id, current_user['id']))
        
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        cursor.close()
        conn.close()
        
        # Annuler la tâche
        result = cancel_scan_task.delay(task_id)
        result_data = result.get(timeout=5)
        
        return jsonify(result_data), 200
        
    except Exception as e:
        logger.error(f"Failed to cancel task: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/tasks/<task_id>/pages', methods=['GET'])
@token_required
def get_task_pages(current_user, task_id):
    """
    Récupère les pages d'une tâche de numérisation
    
    Args:
        task_id: ID de la tâche
        
    Returns:
        Liste des pages
    """
    try:
        import psycopg2
        
        conn = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST', 'localhost'),
            port=int(os.getenv('POSTGRES_PORT', 5432)),
            database=os.getenv('POSTGRES_DB', 'archiflow'),
            user=os.getenv('POSTGRES_USER', 'archiflow_user'),
            password=os.getenv('POSTGRES_PASSWORD', 'archiflow_password_2024')
        )
        cursor = conn.cursor()
        
        # Vérifier que la tâche appartient à l'utilisateur
        cursor.execute("""
            SELECT id FROM scan_task
            WHERE id = %s AND utilisateur_id = %s
        """, (task_id, current_user['id']))
        
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        # Récupérer les pages
        cursor.execute("""
            SELECT id, task_id, page_number, original_path, processed_path,
                   ocr_text, metadata, created_at, processed_at
            FROM scan_page
            WHERE task_id = %s
            ORDER BY page_number
        """, (task_id,))
        
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        pages = []
        for row in rows:
            pages.append({
                'id': row[0],
                'task_id': row[1],
                'page_number': row[2],
                'original_path': row[3],
                'processed_path': row[4],
                'ocr_text': row[5],
                'metadata': row[6],
                'created_at': row[7].isoformat() if row[7] else None,
                'processed_at': row[8].isoformat() if row[8] else None
            })
        
        return jsonify({
            'success': True,
            'pages': pages,
            'count': len(pages)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get task pages: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/enhance', methods=['POST'])
@token_required
def enhance_image_endpoint(current_user):
    """
    Améliore une image scannée
    
    Body:
        - page_id: ID de la page
        - settings: Paramètres de traitement
        
    Returns:
        ID de la tâche Celery
    """
    try:
        data = request.get_json()
        
        if not data or 'page_id' not in data:
            return jsonify({
                'success': False,
                'error': 'page_id is required'
            }), 400
        
        page_id = data['page_id']
        settings = data.get('settings', {})
        
        # TODO: Récupérer les chemins depuis la base de données
        input_path = f"/tmp/scan_{page_id}_original.jpg"
        output_path = f"/tmp/scan_{page_id}_enhanced.jpg"
        
        # Lancer la tâche
        task = enhance_image_task.delay(page_id, input_path, output_path, settings)
        
        return jsonify({
            'success': True,
            'task_id': task.id,
            'page_id': page_id
        }), 202
        
    except Exception as e:
        logger.error(f"Failed to enhance image: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/ocr', methods=['POST'])
@token_required
def perform_ocr_endpoint(current_user):
    """
    Effectue l'OCR sur une page
    
    Body:
        - page_id: ID de la page
        - language: Langue pour l'OCR (fra, eng, etc.)
        
    Returns:
        ID de la tâche Celery
    """
    try:
        data = request.get_json()
        
        if not data or 'page_id' not in data:
            return jsonify({
                'success': False,
                'error': 'page_id is required'
            }), 400
        
        page_id = data['page_id']
        language = data.get('language', 'fra')
        
        # TODO: Récupérer le chemin depuis la base de données
        image_path = f"/tmp/scan_{page_id}_enhanced.jpg"
        
        # Lancer la tâche
        task = perform_ocr_task.delay(page_id, image_path, language)
        
        return jsonify({
            'success': True,
            'task_id': task.id,
            'page_id': page_id
        }), 202
        
    except Exception as e:
        logger.error(f"Failed to perform OCR: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/celery/task/<task_id>', methods=['GET'])
@token_required
def get_celery_task_status(current_user, task_id):
    """
    Récupère le statut d'une tâche Celery
    
    Args:
        task_id: ID de la tâche Celery
        
    Returns:
        Statut de la tâche
    """
    try:
        task = AsyncResult(task_id, app=celery_app)
        
        response = {
            'task_id': task_id,
            'state': task.state,
            'ready': task.ready(),
            'successful': task.successful() if task.ready() else None,
            'failed': task.failed() if task.ready() else None
        }
        
        if task.state == 'PROGRESS':
            response['info'] = task.info
        elif task.ready():
            if task.successful():
                response['result'] = task.result
            elif task.failed():
                response['error'] = str(task.info)
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Failed to get Celery task status: {e}")
        return jsonify({
            'error': str(e)
        }), 500
