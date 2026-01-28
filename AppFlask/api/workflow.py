from flask import Blueprint, request, jsonify, current_app
from AppFlask.db import db_connection
from .auth import token_required, log_user_action
from AppFlask.models.workflow import Workflow
from AppFlask.models.workflow_instance import WorkflowInstance
from psycopg2.extras import RealDictCursor
import json
from AppFlask.utils.auth_utils import role_required, require_json_fields

bp = Blueprint('api_workflow', __name__)

# === GESTION DES MODÈLES DE WORKFLOW ===

@bp.route('/workflows', methods=['GET'])
@token_required
def get_workflows(current_user):
    """Récupérer tous les workflows"""
    try:
        organisation_id = request.args.get('organisation_id')
        workflows = Workflow.get_all(organisation_id=organisation_id)
        
        return jsonify([Workflow.to_dict(w) for w in workflows]), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des workflows: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/workflows', methods=['POST'])
@token_required
@role_required('admin', 'editor')
@require_json_fields(['nom'])
def create_workflow(current_user):
    """Créer un nouveau workflow"""
    try:
        data = request.get_json()
        
        if not data or not data.get('nom'):
            return jsonify({'error': 'Le nom du workflow est requis'}), 400
        
        # Créer le workflow
        workflow_id = Workflow.create(
            nom=data['nom'],
            description=data.get('description', ''),
            createur_id=current_user['id'],
            organisation_id=data.get('organisation_id')
        )
        
        # Ajouter les étapes si fournies
        etapes = data.get('etapes', [])
        for etape_data in etapes:
            if not etape_data.get('nom'):
                continue
                
            etape_id = Workflow.add_etape(
                workflow_id=workflow_id,
                nom=etape_data['nom'],
                description=etape_data.get('description', ''),
                type_approbation=etape_data.get('type_approbation', 'SIMPLE'),
                delai_max=etape_data.get('delai_max')
            )
            
            # Ajouter les approbateurs pour cette étape
            approbateurs = etape_data.get('approbateurs', [])
            for approbateur in approbateurs:
                Workflow.add_approbateur(
                    etape_id=etape_id,
                    utilisateur_id=approbateur.get('utilisateur_id'),
                    role_id=approbateur.get('role_id'),
                    organisation_id=approbateur.get('organisation_id')
                )
        
        # Enregistrer l'action
        log_user_action(
            current_user['id'],
            'WORKFLOW_CREATE',
            f"Création du workflow '{data['nom']}' (ID: {workflow_id})",
            request
        )
        
        return jsonify({
            'message': 'Workflow créé avec succès',
            'workflow_id': workflow_id
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la création du workflow: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/workflows/<int:workflow_id>', methods=['GET'])
@token_required
def get_workflow(current_user, workflow_id):
    """Récupérer un workflow avec ses étapes"""
    try:
        workflow = Workflow.get_by_id(workflow_id)
        if not workflow:
            return jsonify({'error': 'Workflow non trouvé'}), 404
        
        # Récupérer les étapes
        etapes = Workflow.get_etapes(workflow_id)
        
        # Récupérer les approbateurs pour chaque étape
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        for etape in etapes:
            cursor.execute("""
                SELECT wa.*, 
                       u.nom as utilisateur_nom, u.prenom as utilisateur_prenom,
                       r.nom as role_nom,
                       o.nom as organisation_nom
                FROM workflow_approbateur wa
                LEFT JOIN utilisateur u ON wa.utilisateur_id = u.id
                LEFT JOIN role r ON wa.role_nom = r.nom
                LEFT JOIN organisation o ON wa.organisation_id = o.id
                WHERE wa.etape_id = %s
            """, (etape['id'],))
            
            etape['approbateurs'] = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        workflow_dict = Workflow.to_dict(workflow)
        workflow_dict['etapes'] = etapes
        
        return jsonify(workflow_dict), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération du workflow: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/workflows/<int:workflow_id>', methods=['PUT'])
@token_required
@role_required('admin', 'editor')
def update_workflow(current_user, workflow_id):
    """Mettre à jour un workflow"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Aucune donnée fournie'}), 400
        
        success = Workflow.update(
            workflow_id=workflow_id,
            nom=data.get('nom'),
            description=data.get('description')
        )
        
        if not success:
            return jsonify({'error': 'Workflow non trouvé'}), 404
        
        # Enregistrer l'action
        log_user_action(
            current_user['id'],
            'WORKFLOW_UPDATE',
            f"Modification du workflow (ID: {workflow_id})",
            request
        )
        
        return jsonify({'message': 'Workflow mis à jour avec succès'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la mise à jour du workflow: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/workflows/<int:workflow_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_workflow(current_user, workflow_id):
    """Supprimer un workflow"""
    try:
        success = Workflow.delete(workflow_id)
        
        if not success:
            return jsonify({'error': 'Workflow non trouvé'}), 404
        
        # Enregistrer l'action
        log_user_action(
            current_user['id'],
            'WORKFLOW_DELETE',
            f"Suppression du workflow (ID: {workflow_id})",
            request
        )
        
        return jsonify({'message': 'Workflow supprimé avec succès'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la suppression du workflow: {e}")
        return jsonify({'error': str(e)}), 500

# === GESTION DES INSTANCES DE WORKFLOW ===

@bp.route('/documents/<int:document_id>/workflows', methods=['POST'])
@token_required
@role_required('admin', 'editor')
@require_json_fields(['workflow_id'])
def start_workflow(current_user, document_id):
    """Démarrer un workflow pour un document"""
    try:
        data = request.get_json()
        
        if not data or not data.get('workflow_id'):
            return jsonify({'error': 'L\'ID du workflow est requis'}), 400
        
        # Vérifier que l'utilisateur a accès au document
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT id, titre FROM document 
            WHERE id = %s AND (proprietaire_id = %s OR id IN (
                SELECT document_id FROM partage WHERE utilisateur_id = %s
            ))
        """, (document_id, current_user['id'], current_user['id']))
        
        document = cursor.fetchone()
        if not document:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Document non trouvé ou accès refusé'}), 403
        
        cursor.close()
        conn.close()
        
        # Créer l'instance de workflow
        instance_id = WorkflowInstance.create(
            workflow_id=data['workflow_id'],
            document_id=document_id,
            initiateur_id=current_user['id'],
            commentaire=data.get('commentaire')
        )
        
        # Enregistrer l'action
        log_user_action(
            current_user['id'],
            'WORKFLOW_START',
            f"Démarrage du workflow pour le document '{document['titre']}' (Instance: {instance_id})",
            request
        )
        
        return jsonify({
            'message': 'Workflow démarré avec succès',
            'instance_id': instance_id
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors du démarrage du workflow: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/documents/<int:document_id>/workflows', methods=['GET'])
@token_required
def get_document_workflows(current_user, document_id):
    """Récupérer les workflows pour un document"""
    try:
        instances = WorkflowInstance.get_by_document(document_id)
        
        return jsonify([WorkflowInstance.to_dict(i) for i in instances]), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des workflows du document: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/workflow-instances', methods=['GET'])
@token_required
def get_all_workflow_instances(current_user):
    """Récupérer toutes les instances de workflow avec pagination optionnelle"""
    try:
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', 0, type=int)
        
        instances = WorkflowInstance.get_all(limit=limit, offset=offset)
        
        return jsonify([WorkflowInstance.to_dict(i) for i in instances]), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des instances de workflow: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/workflow-instances/pending', methods=['GET'])
@token_required
def get_pending_approvals(current_user):
    """Récupérer les approbations en attente pour l'utilisateur"""
    try:
        instances = WorkflowInstance.get_pending_approvals(current_user['id'])
        
        return jsonify([WorkflowInstance.to_dict(i) for i in instances]), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des approbations en attente: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/workflow-instances/<int:instance_id>/approve', methods=['POST'])
@token_required
@role_required('admin', 'editor')
def approve_workflow_step(current_user, instance_id):
    """Approuver une étape de workflow"""
    try:
        data = request.get_json() or {}
        
        # Obtenir l'instance et l'étape courante
        instance = WorkflowInstance.get_by_id(instance_id)
        if not instance:
            return jsonify({'error': 'Instance de workflow non trouvée'}), 404
        
        if str(instance.get('statut','')).lower() != 'en_cours':
            return jsonify({'error': 'Cette instance de workflow n\'est plus active'}), 400
        
        # Approuver l'étape
        success = WorkflowInstance.approve_step(
            instance_id=instance_id,
            etape_id=instance['etape_courante_id'],
            approbateur_id=current_user['id'],
            commentaire=data.get('commentaire')
        )
        
        if not success:
            return jsonify({'error': 'Erreur lors de l\'approbation'}), 500
        
        # Enregistrer l'action
        log_user_action(
            current_user['id'],
            'WORKFLOW_APPROVE',
            f"Approbation de l'étape '{instance['etape_courante_nom']}' pour le document '{instance['document_titre']}'",
            request
        )
        
        return jsonify({'message': 'Étape approuvée avec succès'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de l'approbation: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/workflow-instances/<int:instance_id>/reject', methods=['POST'])
@token_required
@role_required('admin', 'editor')
def reject_workflow_step(current_user, instance_id):
    """Rejeter une étape de workflow"""
    try:
        data = request.get_json() or {}
        
        # Obtenir l'instance et l'étape courante
        instance = WorkflowInstance.get_by_id(instance_id)
        if not instance:
            return jsonify({'error': 'Instance de workflow non trouvée'}), 404
        
        if instance['statut'] != 'EN_COURS':
            return jsonify({'error': 'Cette instance de workflow n\'est plus active'}), 400
        
        # Rejeter l'étape
        success = WorkflowInstance.reject_step(
            instance_id=instance_id,
            etape_id=instance['etape_courante_id'],
            approbateur_id=current_user['id'],
            commentaire=data.get('commentaire')
        )
        
        if not success:
            return jsonify({'error': 'Erreur lors du rejet'}), 500
        
        # Enregistrer l'action
        log_user_action(
            current_user['id'],
            'WORKFLOW_REJECT',
            f"Rejet de l'étape '{instance['etape_courante_nom']}' pour le document '{instance['document_titre']}'",
            request
        )
        
        return jsonify({'message': 'Étape rejetée avec succès'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors du rejet: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/workflow-instances/<int:instance_id>/cancel', methods=['POST'])
@token_required
@role_required('admin', 'editor')
def cancel_workflow_instance(current_user, instance_id):
    """Annuler une instance de workflow"""
    try:
        success = WorkflowInstance.cancel(instance_id, current_user['id'])
        
        if not success:
            return jsonify({'error': 'Instance non trouvée ou permission refusée'}), 404
        
        # Enregistrer l'action
        log_user_action(
            current_user['id'],
            'WORKFLOW_CANCEL',
            f"Annulation de l'instance de workflow (ID: {instance_id})",
            request
        )
        
        return jsonify({'message': 'Instance de workflow annulée avec succès'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de l'annulation: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/workflow-instances/<int:instance_id>', methods=['GET'])
@token_required
def get_workflow_instance(current_user, instance_id):
    """Récupérer une instance de workflow avec son historique"""
    try:
        instance = WorkflowInstance.get_by_id(instance_id)
        if not instance:
            return jsonify({'error': 'Instance non trouvée'}), 404
        
        # Récupérer l'historique des approbations
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT wa.*, e.nom as etape_nom, u.nom as approbateur_nom, u.prenom as approbateur_prenom
            FROM workflow_approbation wa
            JOIN etape_workflow e ON wa.etape_id = e.id
            JOIN utilisateur u ON wa.approbateur_id = u.id
            WHERE wa.instance_id = %s
            ORDER BY wa.date_decision DESC
        """, (instance_id,))
        
        approbations = cursor.fetchall()
        cursor.close()
        conn.close()
        
        instance_dict = WorkflowInstance.to_dict(instance)
        instance_dict['approbations'] = approbations
        
        return jsonify(instance_dict), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération de l'instance: {e}")
        return jsonify({'error': str(e)}), 500

# === STATISTIQUES WORKFLOW ===

@bp.route('/workflow-stats', methods=['GET'])
@token_required
def get_workflow_stats(current_user):
    """Statistiques consolidées des workflows (role-aware)"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Total des modèles de workflow
        cursor.execute("SELECT COUNT(*) AS cnt FROM workflow")
        total_workflows = cursor.fetchone()["cnt"] if cursor.description[0].name != 'count' else cursor.fetchone()['count']

        is_admin = str(current_user.get('role', '')).lower() == 'admin'
        user_id = current_user['id']

        if is_admin:
            # Instances actives (toutes)
            cursor.execute("""
                SELECT COUNT(*) AS cnt
                FROM workflow_instance wi
                WHERE wi.statut = 'EN_COURS'
            """)
            active_instances = cursor.fetchone()['cnt']

            # Approbations en attente pour l'ensemble (compter les affectées à quelqu'un)
            cursor.execute("""
                SELECT COUNT(*) AS cnt
                FROM workflow_instance wi
                WHERE wi.statut = 'EN_COURS'
            """)
            pending_approvals = cursor.fetchone()['cnt']

            # Terminées aujourd'hui
            cursor.execute("""
                SELECT COUNT(*) AS cnt
                FROM workflow_instance wi
                WHERE wi.statut = 'TERMINE' AND wi.date_fin::date = CURRENT_DATE
            """)
            completed_today = cursor.fetchone()['cnt']
        else:
            # Instances actives visibles pour l'utilisateur (initiateur ou approbateur courant)
            cursor.execute("""
                SELECT COUNT(*) AS cnt
                FROM workflow_instance wi
                LEFT JOIN etape_workflow e ON wi.etape_courante_id = e.id
                LEFT JOIN workflow_approbateur wa ON wa.etape_id = e.id
                WHERE wi.statut = 'EN_COURS'
                  AND (wi.initiateur_id = %s OR wa.utilisateur_id = %s)
            """, (user_id, user_id))
            active_instances = cursor.fetchone()['cnt']

            # Approbations en attente assignées à l'utilisateur
            cursor.execute("""
                SELECT COUNT(*) AS cnt
                FROM workflow_instance wi
                LEFT JOIN etape_workflow e ON wi.etape_courante_id = e.id
                LEFT JOIN workflow_approbateur wa ON wa.etape_id = e.id
                WHERE wi.statut = 'EN_COURS' AND wa.utilisateur_id = %s
            """, (user_id,))
            pending_approvals = cursor.fetchone()['cnt']

            # Terminées aujourd'hui (initiées par l'utilisateur)
            cursor.execute("""
                SELECT COUNT(*) AS cnt
                FROM workflow_instance wi
                WHERE wi.statut = 'TERMINE' AND wi.date_fin::date = CURRENT_DATE AND wi.initiateur_id = %s
            """, (user_id,))
            completed_today = cursor.fetchone()['cnt']

        cursor.close()
        conn.close()

        return jsonify({
            'totalWorkflows': int(total_workflows) if isinstance(total_workflows, (int,)) else total_workflows,
            'activeInstances': active_instances,
            'pendingApprovals': pending_approvals,
            'completedToday': completed_today
        }), 200
    except Exception as e:
        current_app.logger.error(f"Erreur lors des statistiques workflow: {e}")
        return jsonify({'error': 'Erreur lors de la récupération des statistiques'}), 500

# === ROUTES UTILITAIRES ===

@bp.route('/users/for-approval', methods=['GET'])
@token_required
def get_users_for_approval(current_user):
    """Récupérer la liste des utilisateurs pour les approbations"""
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT id, nom, prenom, email, role
            FROM utilisateur
            WHERE id != %s
            ORDER BY nom, prenom
        """, (current_user['id'],))
        
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(users), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des utilisateurs: {e}")
        return jsonify({'error': str(e)}), 500

# === ROUTE SPÉCIFIQUE POUR LE WORKFLOW D'ARCHIVAGE ===

@bp.route('/workflows/archivage', methods=['GET'])
@token_required
def get_archivage_workflow(current_user):
    """Récupérer le workflow d'archivage"""
    try:
        # Rechercher un workflow avec 'archivage' dans le nom
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT * FROM workflow
            WHERE LOWER(nom) LIKE %s
            LIMIT 1
        """, ('%archivage%',))
        
        workflow = cursor.fetchone()
        
        if not workflow:
            # Si aucun workflow d'archivage n'existe, en créer un par défaut
            workflow_id = Workflow.create(
                nom="Workflow d'archivage",
                description="Workflow pour la gestion des demandes d'archivage de documents",
                createur_id=current_user['id']
            )
            
            # Créer les étapes du workflow
            etape1_id = Workflow.add_etape(
                workflow_id=workflow_id,
                nom="Validation chef de service",
                description="Validation de la demande d'archivage par le chef de service",
                type_approbation="SIMPLE",
                ordre=1
            )
            
            etape2_id = Workflow.add_etape(
                workflow_id=workflow_id,
                nom="Validation archiviste",
                description="Validation finale par l'archiviste",
                type_approbation="SIMPLE",
                ordre=2
            )
            
            # Récupérer le workflow créé
            cursor.execute("SELECT * FROM workflow WHERE id = %s", (workflow_id,))
            workflow = cursor.fetchone()
            
            # Enregistrer l'action
            log_user_action(
                current_user['id'],
                'WORKFLOW_CREATE',
                f"Création automatique du workflow d'archivage (ID: {workflow_id})",
                request
            )
            
            current_app.logger.info(f"Workflow d'archivage créé automatiquement avec l'ID {workflow_id}")
        
        cursor.close()
        conn.close()
        
        return jsonify(workflow), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération du workflow d'archivage: {e}")
        return jsonify({'error': str(e)}), 500 

@bp.route('/workflows/<int:workflow_id>/etapes/<int:etape_id>/approbateurs', methods=['PUT'])
@token_required
@role_required('admin', 'editor')
def replace_approvers(current_user, workflow_id, etape_id):
    """Remplacer les approbateurs pour une étape de workflow"""
    try:
        payload = request.get_json() or {}
        approbateurs = payload.get('approbateurs', [])

        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Vérifier que l'étape appartient bien au workflow
        cursor.execute("""
            SELECT id FROM etape_workflow
            WHERE id = %s AND workflow_id = %s
        """, (etape_id, workflow_id))
        if cursor.fetchone() is None:
            cursor.close()
            conn.close()
            return jsonify({'error': "Étape non trouvée pour ce workflow"}), 404

        # Supprimer les approbateurs actuels
        cursor.execute("DELETE FROM workflow_approbateur WHERE etape_id = %s", (etape_id,))

        # Ajouter les nouveaux approbateurs (supporte utilisateur/role/organisation)
        for appro in approbateurs:
            utilisateur_id = appro.get('utilisateur_id') or (appro.get('type') == 'utilisateur' and appro.get('id')) or None
            # Le schéma stocke le rôle par son nom (role.nom)
            role_nom = appro.get('role_nom') or (appro.get('type') == 'role' and appro.get('id')) or appro.get('role_id') or None
            organisation_id = appro.get('organisation_id') or (appro.get('type') == 'organisation' and appro.get('id')) or None

            if not any([utilisateur_id, role_nom, organisation_id]):
                continue

            cursor.execute(
                """
                INSERT INTO workflow_approbateur (etape_id, utilisateur_id, role_nom, organisation_id)
                VALUES (%s, %s, %s, %s)
                """,
                (etape_id, utilisateur_id, role_nom, organisation_id)
            )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Approbateurs remplacés avec succès'}), 200

    except Exception as e:
        current_app.logger.error(f"Erreur lors de la mise à jour des approbateurs: {e}")
        return jsonify({'error': 'Erreur lors de la mise à jour des approbateurs'}), 500
