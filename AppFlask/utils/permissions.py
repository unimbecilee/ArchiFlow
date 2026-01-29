"""
Système de gestion des permissions pour les documents partagés
"""

from AppFlask.db import db_connection
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger(__name__)

# Permissions disponibles
PERMISSION_LECTURE = 'lecture'
PERMISSION_TELECHARGEMENT = 'téléchargement'
PERMISSION_MODIFICATION = 'modification'
PERMISSION_COMMENTAIRE = 'commentaire'
PERMISSION_REPARTAGE = 'partage_supplementaire'

def check_document_permission(doc_id: int, user_id: int, required_permission: str) -> bool:
    """
    Vérifier si un utilisateur a une permission spécifique sur un document
    
    Args:
        doc_id: ID du document
        user_id: ID de l'utilisateur
        required_permission: Permission requise ('lecture', 'téléchargement', 'modification', 'commentaire', 'partage_supplementaire')
    
    Returns:
        bool: True si l'utilisateur a la permission, False sinon
    """
    try:
        logger.info(f"🔍 Vérification permission '{required_permission}' pour user_id={user_id} sur doc_id={doc_id}")
        
        conn = db_connection()
        if not conn:
            logger.error("Impossible de se connecter à la base de données")
            return False
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Récupérer le document et vérifier qu'il existe
        cursor.execute("""
            SELECT proprietaire_id, is_deleted 
            FROM document 
            WHERE id = %s
        """, (doc_id,))
        doc = cursor.fetchone()

        if doc is None:
            logger.warning(f"Document {doc_id} non trouvé")
            cursor.close()
            conn.close()
            return False

        # Vérifier que le document n'est pas supprimé
        if doc.get('is_deleted', False):
            logger.warning(f"Document {doc_id} est supprimé")
            cursor.close()
            conn.close()
            return False

        # 2. Le propriétaire a tous les droits
        if doc['proprietaire_id'] == int(user_id):
            cursor.close()
            conn.close()
            return True

        # 3. Vérifier si l'utilisateur est admin (tous les droits)
        cursor.execute("SELECT role FROM utilisateur WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if user and user.get('role', '').lower() == 'admin':
            cursor.close()
            conn.close()
            return True

        # 4. Vérifier les partages directs (utilisateur)
        cursor.execute("""
            SELECT permissions 
            FROM partage_document
            WHERE document_id = %s 
              AND utilisateur_id = %s 
              AND actif = TRUE
              AND (date_expiration IS NULL OR date_expiration > NOW())
        """, (doc_id, user_id))
        partage_user = cursor.fetchone()

        # 5. Vérifier les partages par rôle
        cursor.execute("""
            SELECT pd.permissions 
            FROM partage_document pd
            INNER JOIN utilisateur u ON u.role = pd.role_nom
            WHERE pd.document_id = %s 
              AND u.id = %s
              AND pd.actif = TRUE
              AND (pd.date_expiration IS NULL OR pd.date_expiration > NOW())
        """, (doc_id, user_id))
        partage_role = cursor.fetchone()

        # 6. Vérifier les partages par organisation
        cursor.execute("""
            SELECT pd.permissions 
            FROM partage_document pd
            INNER JOIN utilisateur u ON u.organisation_id = pd.organisation_id
            WHERE pd.document_id = %s 
              AND u.id = %s
              AND pd.actif = TRUE
              AND (pd.date_expiration IS NULL OR pd.date_expiration > NOW())
        """, (doc_id, user_id))
        partage_org = cursor.fetchone()

        cursor.close()
        conn.close()

        # Collecter toutes les permissions de l'utilisateur
        all_permissions = set()
        
        if partage_user:
            all_permissions.update(partage_user['permissions'])
        if partage_role:
            all_permissions.update(partage_role['permissions'])
        if partage_org:
            all_permissions.update(partage_org['permissions'])

        # Vérifier si l'utilisateur a la permission requise
        if not all_permissions:
            return False

        # La lecture est toujours accordée si l'utilisateur a au moins un partage actif
        if required_permission == PERMISSION_LECTURE:
            return True
        
        # Pour les autres permissions, vérifier explicitement
        return required_permission in all_permissions

    except Exception as e:
        logger.error(f"Erreur dans check_document_permission: {e}")
        return False


def get_user_permissions(doc_id: int, user_id: int) -> list:
    """
    Récupérer toutes les permissions d'un utilisateur sur un document
    
    Args:
        doc_id: ID du document
        user_id: ID de l'utilisateur
    
    Returns:
        list: Liste des permissions de l'utilisateur
    """
    try:
        conn = db_connection()
        if not conn:
            return []
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Vérifier si propriétaire ou admin
        cursor.execute("""
            SELECT d.proprietaire_id, u.role
            FROM document d
            CROSS JOIN utilisateur u
            WHERE d.id = %s AND u.id = %s
        """, (doc_id, user_id))
        result = cursor.fetchone()

        if result:
            if result['proprietaire_id'] == int(user_id) or result.get('role', '').lower() == 'admin':
                cursor.close()
                conn.close()
                return [
                    PERMISSION_LECTURE,
                    PERMISSION_TELECHARGEMENT,
                    PERMISSION_MODIFICATION,
                    PERMISSION_COMMENTAIRE,
                    PERMISSION_REPARTAGE
                ]

        # Récupérer les permissions depuis les partages
        cursor.execute("""
            SELECT DISTINCT unnest(permissions) as permission
            FROM partage_document
            WHERE document_id = %s 
              AND (
                  utilisateur_id = %s
                  OR role_nom IN (SELECT role FROM utilisateur WHERE id = %s)
                  OR organisation_id IN (SELECT organisation_id FROM utilisateur WHERE id = %s)
              )
              AND actif = TRUE
              AND (date_expiration IS NULL OR date_expiration > NOW())
        """, (doc_id, user_id, user_id, user_id))
        
        permissions = [row['permission'] for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        
        return permissions

    except Exception as e:
        logger.error(f"Erreur dans get_user_permissions: {e}")
        return []


def can_user_share_document(doc_id: int, user_id: int) -> bool:
    """
    Vérifier si un utilisateur peut partager un document (re-partage)
    
    Args:
        doc_id: ID du document
        user_id: ID de l'utilisateur
    
    Returns:
        bool: True si l'utilisateur peut partager, False sinon
    """
    return check_document_permission(doc_id, user_id, PERMISSION_REPARTAGE)
