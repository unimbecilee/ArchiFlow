"""
Configuration OpenAPI/Swagger pour la documentation API
"""
from flask_restx import Api, Resource, fields
from flask import Blueprint

# Création du blueprint pour la documentation API
api_bp = Blueprint('api_docs', __name__)

# Initialisation de l'API RESTX
api = Api(
    api_bp,
    version='1.0',
    title='ESAG GED API',
    description='API REST pour le système de Gestion Électronique de Documents ESAG GED',
    # Le blueprint est monté avec url_prefix='/api' dans app.py, donc exposer la doc à /api/docs
    doc='/docs',
    prefix='',
    security='Bearer Auth',
    authorizations={
        'Bearer Auth': {
            'type': 'apiKey',
            'in': 'header',
            'name': 'Authorization',
            'description': 'Format: Bearer {token}'
        }
    }
)

# Modèles de données pour la documentation
document_model = api.model('Document', {
    'id': fields.Integer(required=True, description='ID du document'),
    'titre': fields.String(required=True, description='Titre du document'),
    'description': fields.String(description='Description du document'),
    'date_creation': fields.DateTime(description='Date de création'),
    'taille': fields.Integer(description='Taille du fichier en octets'),
    'type_document': fields.String(description='Type de document'),
    'proprietaire_id': fields.Integer(description='ID du propriétaire'),
})

document_list_model = api.model('DocumentList', {
    'documents': fields.List(fields.Nested(document_model)),
    'total': fields.Integer(description='Nombre total de documents'),
    'page': fields.Integer(description='Page actuelle'),
    'per_page': fields.Integer(description='Éléments par page'),
})

error_model = api.model('Error', {
    'error': fields.String(required=True, description='Message d\'erreur'),
    'status': fields.String(description='Statut de l\'erreur'),
})

success_model = api.model('Success', {
    'message': fields.String(required=True, description='Message de succès'),
    'status': fields.String(description='Statut de l\'opération'),
})

# Modèles additionnels (Auth, Partage, Workflow)
login_request_model = api.model('LoginRequest', {
    'email': fields.String(required=True),
    'password': fields.String(required=True),
})

login_response_model = api.model('LoginResponse', {
    'access_token': fields.String(required=True),
    'user': fields.Raw(description='Informations utilisateur'),
})

share_recipient_model = api.model('ShareRecipient', {
    'type': fields.String(enum=['utilisateur', 'role', 'organisation'], required=True),
    'id': fields.String(required=True),
    'nom': fields.String,
})

share_request_model = api.model('ShareRequest', {
    'destinataires': fields.List(fields.Nested(share_recipient_model), required=True),
    'permissions': fields.List(fields.String(enum=['lecture','téléchargement','modification','commentaire','partage_supplementaire'])),
    'date_expiration': fields.String(description='ISO8601'),
    'commentaire': fields.String,
})

workflow_create_model = api.model('WorkflowCreate', {
    'nom': fields.String(required=True),
    'description': fields.String,
    'organisation_id': fields.Integer,
    'etapes': fields.List(fields.Raw, description='Liste des étapes'),
})

# Namespaces pour organiser les endpoints
ns_documents = api.namespace('documents', description='Opérations sur les documents')
ns_auth = api.namespace('auth', description='Authentification et autorisation')
ns_workflow = api.namespace('workflow', description='Gestion des workflows')
ns_trash = api.namespace('trash', description='Gestion de la corbeille')
ns_sharing = api.namespace('sharing', description='Partage de documents')
ns_versions = api.namespace('versions', description='Gestion des versions de documents')
ns_comments = api.namespace('comments', description='Commentaires sur documents')
ns_subscriptions = api.namespace('subscriptions', description='Abonnements aux documents')
ns_checkout = api.namespace('checkout', description='Check-out/Check-in des documents')
ns_ocr = api.namespace('ocr', description='OCR et extraction de texte')
ns_search = api.namespace('search', description='Recherche simple et avancée')
ns_notifications = api.namespace('notifications', description='Notifications utilisateur')

# Route de base pour tester l'API
@api.route('/')
class ApiInfo(Resource):
    """Informations sur l'API"""
    
    @api.doc('api_info')
    @api.marshal_with(success_model)
    def get(self):
        """Informations sur l'API ESAG GED"""
        return {
            'message': 'ESAG GED API v1.0',
            'status': 'active',
            'endpoints': {
                'documents': '/api/documents',
                'auth': '/api/auth',
                'workflow': '/api/workflow',
                'trash': '/api/trash',
                'docs': '/api/docs'
            }
        }

# Endpoints de documentation (stubs) pour schémas d'entrée/sortie
@ns_auth.route('/login')
class AuthLoginDoc(Resource):
    @ns_auth.expect(login_request_model, validate=False)
    @ns_auth.response(200, 'OK', login_response_model)
    @ns_auth.response(401, 'Unauthorized', error_model)
    def post(self):
        """Documentation de l'endpoint de connexion (POST /api/login)."""
        return {'message': 'Voir POST /api/login'}, 200

@ns_sharing.route('/documents/<int:document_id>/share')
class ShareDoc(Resource):
    @ns_sharing.expect(share_request_model, validate=False)
    @ns_sharing.response(201, 'Created', success_model)
    @ns_sharing.response(400, 'Bad Request', error_model)
    @ns_sharing.response(401, 'Unauthorized', error_model)
    def post(self, document_id):
        """Documentation: POST /api/documents/<id>/share (voir API réelle)."""
        return {'message': 'Voir POST /api/documents/<id>/share'}, 200

@ns_workflow.route('/workflows')
class WorkflowCreateDoc(Resource):
    @ns_workflow.expect(workflow_create_model, validate=False)
    @ns_workflow.response(201, 'Created', success_model)
    def post(self):
        """Documentation: POST /api/workflows (création workflow)."""
        return {'message': 'Voir POST /api/workflows'}, 200

# ==============================
# Documents (stubs de doc)
# ==============================

documents_my_query = api.parser()
documents_my_query.add_argument('dossier_id', type=int, required=False)
documents_my_query.add_argument('admin_mode', type=bool, required=False)

@ns_documents.route('/my')
class DocumentsMyDoc(Resource):
    @ns_documents.expect(documents_my_query)
    @ns_documents.response(200, 'OK', fields.List(fields.Nested(document_model)))
    def get(self):
        """Documentation: GET /api/documents/my (liste des documents propres)."""
        return {'message': 'Voir GET /api/documents/my'}, 200

@ns_documents.route('/<int:doc_id>')
class DocumentByIdDoc(Resource):
    @ns_documents.response(200, 'OK', document_model)
    @ns_documents.response(403, 'Forbidden', error_model)
    @ns_documents.response(404, 'Not Found', error_model)
    def get(self, doc_id):
        """Documentation: GET /api/documents/<id> (détails document)."""
        return {'message': 'Voir GET /api/documents/<id>'}, 200

upload_response_model = api.model('UploadResponse', {
    'message': fields.String,
    'document_id': fields.Integer,
    'cloudinary_url': fields.String,
})

@ns_documents.route('/upload')
class DocumentUploadDoc(Resource):
    @ns_documents.response(201, 'Created', upload_response_model)
    @ns_documents.response(400, 'Bad Request', error_model)
    def post(self):
        """Documentation: POST /api/documents/upload (multipart/form-data)."""
        return {'message': 'Voir POST /api/documents/upload'}, 200

# ==============================
# Trash (stubs de doc)
# ==============================

trash_query = api.parser()
trash_query.add_argument('page', type=int, required=False)
trash_query.add_argument('per_page', type=int, required=False)
trash_query.add_argument('type', type=str, required=False)
trash_query.add_argument('user_filter', type=str, required=False)
trash_query.add_argument('search', type=str, required=False)

trash_item_model = api.model('TrashItem', {
    'id': fields.Integer,
    'item_type': fields.String,
    'item_data': fields.Raw,
    'deleted_at': fields.String,
})

trash_list_model = api.model('TrashList', {
    'items': fields.List(fields.Nested(trash_item_model)),
    'total': fields.Integer,
    'page': fields.Integer,
    'per_page': fields.Integer,
})

@ns_trash.route('')
class TrashListDoc(Resource):
    @ns_trash.expect(trash_query)
    @ns_trash.response(200, 'OK', trash_list_model)
    def get(self):
        """Documentation: GET /api/trash (liste corbeille)."""
        return {'message': 'Voir GET /api/trash'}, 200

@ns_trash.route('/<int:trash_id>/restore')
class TrashRestoreDoc(Resource):
    @ns_trash.response(200, 'OK', success_model)
    @ns_trash.response(404, 'Not Found', error_model)
    def post(self, trash_id):
        """Documentation: POST /api/trash/<id>/restore (restaurer élément)."""
        return {'message': 'Voir POST /api/trash/<id>/restore'}, 200

@ns_trash.route('/<int:trash_id>')
class TrashDeleteDoc(Resource):
    @ns_trash.response(200, 'OK', success_model)
    @ns_trash.response(404, 'Not Found', error_model)
    def delete(self, trash_id):
        """Documentation: DELETE /api/trash/<id> (supprimer définitivement)."""
        return {'message': 'Voir DELETE /api/trash/<id>'}, 200

bulk_ids_model = api.model('BulkIds', {
    'trash_ids': fields.List(fields.Integer, required=True)
})

@ns_trash.route('/bulk-restore')
class TrashBulkRestoreDoc(Resource):
    @ns_trash.expect(bulk_ids_model, validate=False)
    @ns_trash.response(200, 'OK', success_model)
    def post(self):
        """Documentation: POST /api/trash/bulk-restore."""
        return {'message': 'Voir POST /api/trash/bulk-restore'}, 200

@ns_trash.route('/bulk-delete')
class TrashBulkDeleteDoc(Resource):
    @ns_trash.expect(bulk_ids_model, validate=False)
    @ns_trash.response(200, 'OK', success_model)
    def delete(self):
        """Documentation: DELETE /api/trash/bulk-delete."""
        return {'message': 'Voir DELETE /api/trash/bulk-delete'}, 200

# ==============================
# Versions (stubs)
# ==============================

version_model = api.model('Version', {
    'id': fields.Integer,
    'document_id': fields.Integer,
    'numero': fields.Integer,
    'titre': fields.String,
    'date_creation': fields.String,
})

@ns_versions.route('/documents/<int:document_id>/versions')
class VersionsListDoc(Resource):
    @ns_versions.response(200, 'OK', fields.List(fields.Nested(version_model)))
    def get(self, document_id):
        """Documentation: GET /api/documents/{id}/versions."""
        return {'message': 'Voir GET /api/documents/{id}/versions'}, 200

    @ns_versions.response(201, 'Created', version_model)
    def post(self, document_id):
        """Documentation: POST /api/documents/{id}/versions (nouvelle version)."""
        return {'message': 'Voir POST /api/documents/{id}/versions'}, 200

@ns_versions.route('/versions/<int:version_id>')
class VersionByIdDoc(Resource):
    @ns_versions.response(200, 'OK', version_model)
    def get(self, version_id):
        """Documentation: GET /api/versions/{id}."""
        return {'message': 'Voir GET /api/versions/{id}'}, 200

# ==============================
# Commentaires (stubs)
# ==============================

comment_model = api.model('Comment', {
    'id': fields.Integer,
    'document_id': fields.Integer,
    'auteur_id': fields.Integer,
    'contenu': fields.String,
    'parent_id': fields.Integer,
    'date_creation': fields.String,
})

@ns_comments.route('/documents/<int:document_id>/comments')
class CommentsListDoc(Resource):
    @ns_comments.response(200, 'OK', fields.List(fields.Nested(comment_model)))
    def get(self, document_id):
        """Documentation: GET /api/documents/{id}/comments."""
        return {'message': 'Voir GET /api/documents/{id}/comments'}, 200

    @ns_comments.expect(api.model('CommentCreate', {'contenu': fields.String(required=True), 'parent_id': fields.Integer}))
    @ns_comments.response(201, 'Created', comment_model)
    def post(self, document_id):
        """Documentation: POST /api/documents/{id}/comments."""
        return {'message': 'Voir POST /api/documents/{id}/comments'}, 200

@ns_comments.route('/comments/<int:comment_id>')
class CommentByIdDoc(Resource):
    @ns_comments.response(200, 'OK', comment_model)
    def get(self, comment_id):
        """Documentation: GET /api/comments/{id}."""
        return {'message': 'Voir GET /api/comments/{id}'}, 200

# ==============================
# Subscriptions (stubs)
# ==============================

subscription_model = api.model('Subscription', {
    'id': fields.Integer,
    'document_id': fields.Integer,
    'utilisateur_id': fields.Integer,
    'notifications': fields.List(fields.String),
})

@ns_subscriptions.route('/documents/<int:document_id>/subscriptions')
class SubscriptionsDoc(Resource):
    @ns_subscriptions.response(200, 'OK', fields.List(fields.Nested(subscription_model)))
    def get(self, document_id):
        """Documentation: GET /api/documents/{id}/subscriptions."""
        return {'message': 'Voir GET /api/documents/{id}/subscriptions'}, 200

    @ns_subscriptions.expect(api.model('SubscriptionCreate', {
        'utilisateur_id': fields.Integer,
        'notification_types': fields.List(fields.String)
    }))
    @ns_subscriptions.response(201, 'Created', subscription_model)
    def post(self, document_id):
        """Documentation: POST /api/documents/{id}/subscriptions."""
        return {'message': 'Voir POST /api/documents/{id}/subscriptions'}, 200

# ==============================
# Checkout (stubs)
# ==============================

@ns_checkout.route('/documents/<int:document_id>/checkout')
class CheckoutDoc(Resource):
    @ns_checkout.response(200, 'OK', success_model)
    def post(self, document_id):
        """Documentation: POST /api/documents/{id}/checkout."""
        return {'message': 'Voir POST /api/documents/{id}/checkout'}, 200

@ns_checkout.route('/documents/<int:document_id>/checkin')
class CheckinDoc(Resource):
    @ns_checkout.response(200, 'OK', success_model)
    def post(self, document_id):
        """Documentation: POST /api/documents/{id}/checkin."""
        return {'message': 'Voir POST /api/documents/{id}/checkin'}, 200

# ==============================
# OCR (stubs)
# ==============================

@ns_ocr.route('/documents/<int:document_id>/ocr')
class OcrDoc(Resource):
    @ns_ocr.expect(api.model('OcrRequest', {'language': fields.String}))
    @ns_ocr.response(200, 'OK', api.model('OcrResponse', {
        'text': fields.String,
        'confidence': fields.Float,
        'language': fields.String,
    }))
    def post(self, document_id):
        """Documentation: POST /api/documents/{id}/ocr."""
        return {'message': 'Voir POST /api/documents/{id}/ocr'}, 200

# ==============================
# Recherche (stubs)
# ==============================

search_query = api.parser()
search_query.add_argument('q', type=str, required=True)
search_query.add_argument('limit', type=int, required=False)
search_query.add_argument('type', type=str, required=False)

@ns_search.route('')
class SearchDoc(Resource):
    @ns_search.expect(search_query)
    @ns_search.response(200, 'OK', api.model('SearchResults', {'results': fields.List(fields.Raw)}))
    def get(self):
        """Documentation: GET /api/search."""
        return {'message': 'Voir GET /api/search'}, 200

advanced_search_query = api.parser()
for arg in ['searchTerm','contentSearch','ocrSearch','documentTypes','owners','tags','status','startDate','endDate','minSize','maxSize','hasAttachments','isShared','isFavorite','hasOCR','language','confidenceThreshold','includeArchived','limit']:
    advanced_search_query.add_argument(arg, required=False)

@ns_search.route('/advanced')
class AdvancedSearchDoc(Resource):
    @ns_search.expect(advanced_search_query)
    @ns_search.response(200, 'OK', api.model('AdvancedSearchResults', {'results': fields.List(fields.Raw)}))
    def get(self):
        """Documentation: GET /api/search/advanced."""
        return {'message': 'Voir GET /api/search/advanced'}, 200

@ns_search.route('/saved')
class SavedSearchesDoc(Resource):
    @ns_search.response(200, 'OK', fields.List(fields.Raw))
    def get(self):
        """Documentation: GET /api/search/saved (liste)."""
        return {'message': 'Voir GET /api/search/saved'}, 200

    @ns_search.expect(api.model('SavedSearchCreate', {
        'name': fields.String(required=True),
        'filters': fields.Raw(required=True)
    }))
    @ns_search.response(201, 'Created', fields.Raw)
    def post(self):
        """Documentation: POST /api/search/saved (création)."""
        return {'message': 'Voir POST /api/search/saved'}, 200

@ns_search.route('/saved/<int:search_id>')
class SavedSearchItemDoc(Resource):
    @ns_search.response(200, 'OK', success_model)
    @ns_search.response(404, 'Not Found', error_model)
    def delete(self, search_id):
        """Documentation: DELETE /api/search/saved/{id}."""
        return {'message': 'Voir DELETE /api/search/saved/{id}'}, 200

@ns_search.route('/saved/<int:search_id>/execute')
class SavedSearchExecuteDoc(Resource):
    @ns_search.response(200, 'OK', fields.Raw)
    def get(self, search_id):
        """Documentation: GET /api/search/saved/{id}/execute."""
        return {'message': 'Voir GET /api/search/saved/{id}/execute'}, 200

# ==============================
# Notifications (stubs)
# ==============================

notifications_query = api.parser()
notifications_query.add_argument('page', type=int, required=False)
notifications_query.add_argument('per_page', type=int, required=False)
notifications_query.add_argument('unread_only', type=bool, required=False)
notifications_query.add_argument('type', type=str, required=False)

@ns_notifications.route('')
class NotificationsListDoc(Resource):
    @ns_notifications.expect(notifications_query)
    @ns_notifications.response(200, 'OK', api.model('NotificationsList', {'notifications': fields.List(fields.Raw)}))
    def get(self):
        """Documentation: GET /api/notifications."""
        return {'message': 'Voir GET /api/notifications'}, 200

@ns_notifications.route('/unread-count')
class NotificationsUnreadDoc(Resource):
    @ns_notifications.response(200, 'OK', api.model('UnreadCount', {'unread_count': fields.Integer}))
    def get(self):
        """Documentation: GET /api/notifications/unread-count."""
        return {'message': 'Voir GET /api/notifications/unread-count'}, 200

@ns_notifications.route('/<int:notification_id>/read')
class NotificationsReadDoc(Resource):
    @ns_notifications.response(200, 'OK', success_model)
    def put(self, notification_id):
        """Documentation: PUT /api/notifications/{id}/read."""
        return {'message': 'Voir PUT /api/notifications/{id}/read'}, 200

@ns_notifications.route('/mark-all-read')
class NotificationsMarkAllDoc(Resource):
    @ns_notifications.response(200, 'OK', success_model)
    def put(self):
        """Documentation: PUT /api/notifications/mark-all-read."""
        return {'message': 'Voir PUT /api/notifications/mark-all-read'}, 200

@ns_notifications.route('/stats')
class NotificationsStatsDoc(Resource):
    @ns_notifications.response(200, 'OK', api.model('NotificationsStats', {'general': fields.Raw, 'by_type': fields.List(fields.Raw)}))
    def get(self):
        """Documentation: GET /api/notifications/stats."""
        return {'message': 'Voir GET /api/notifications/stats'}, 200

@ns_notifications.route('/preferences')
class NotificationsPreferencesDoc(Resource):
    @ns_notifications.response(200, 'OK', fields.Raw)
    def get(self):
        """Documentation: GET /api/notifications/preferences."""
        return {'message': 'Voir GET /api/notifications/preferences'}, 200

@ns_notifications.route('/<int:notification_id>/click')
class NotificationsClickDoc(Resource):
    @ns_notifications.response(200, 'OK', api.model('NotificationClick', {'redirect_url': fields.String}))
    def post(self, notification_id):
        """Documentation: POST /api/notifications/{id}/click."""
        return {'message': 'Voir POST /api/notifications/{id}/click'}, 200

@ns_notifications.route('/archive-request')
class NotificationsArchiveRequestDoc(Resource):
    @ns_notifications.expect(api.model('ArchiveRequest', {
        'document_id': fields.Integer(required=True),
        'document_title': fields.String(required=True),
        'comment': fields.String
    }))
    @ns_notifications.response(200, 'OK', success_model)
    def post(self):
        """Documentation: POST /api/notifications/archive-request."""
        return {'message': 'Voir POST /api/notifications/archive-request'}, 200
