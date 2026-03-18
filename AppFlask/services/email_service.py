import os
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from flask import current_app, render_template_string
from flask_mail import Mail, Message
from jinja2 import Template
from AppFlask.config.email_config import EmailConfig
from AppFlask.db import db_connection
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

class EmailService:
    """Service pour l'envoi d'emails"""
    
    def __init__(self, app=None):
        self.mail = None
        self.app = app
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialise le service email avec l'application Flask"""
        self.app = app
        
        # Configuration Flask-Mail
        email_config = EmailConfig.get_config()
        for key, value in email_config.items():
            app.config[key] = value
        
        # Initialisation de Flask-Mail
        self.mail = Mail(app)
        logger.info("Service email initialisé")
    
    def is_configured(self) -> bool:
        """Vérifie si le service email est configuré"""
        return EmailConfig.is_configured() and self.mail is not None
    
    def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        sender: Optional[str] = None
    ) -> bool:
        """
        Envoie un email
        
        Args:
            to: Liste des destinataires
            subject: Sujet de l'email
            body: Corps de l'email en texte brut
            html_body: Corps de l'email en HTML (optionnel)
            cc: Liste des destinataires en copie (optionnel)
            bcc: Liste des destinataires en copie cachée (optionnel)
            attachments: Liste des pièces jointes (optionnel)
            sender: Expéditeur personnalisé (optionnel)
        
        Returns:
            bool: True si l'email a été envoyé avec succès
        """
        if not self.is_configured():
            logger.error("Service email non configuré")
            return False
        
        try:
            msg = Message(
                subject=subject,
                recipients=to,
                body=body,
                html=html_body,
                cc=cc or [],
                bcc=bcc or [],
                sender=sender or EmailConfig.MAIL_DEFAULT_SENDER
            )
            
            # Ajouter les pièces jointes si présentes
            if attachments:
                for attachment in attachments:
                    msg.attach(
                        filename=attachment.get('filename'),
                        content_type=attachment.get('content_type'),
                        data=attachment.get('data')
                    )
            
            self.mail.send(msg)
            
            # Enregistrer l'envoi en base de données
            self._log_email_sent(to, subject, sender)
            
            logger.info(f"Email envoyé avec succès à {', '.join(to)}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'email: {str(e)}")
            return False
    
    def send_template_email(
        self,
        to: List[str],
        template_name: str,
        subject: str,
        template_data: Dict[str, Any],
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        sender: Optional[str] = None
    ) -> bool:
        """
        Envoie un email basé sur un template
        
        Args:
            to: Liste des destinataires
            template_name: Nom du template à utiliser
            subject: Sujet de l'email
            template_data: Données à injecter dans le template
            cc: Liste des destinataires en copie (optionnel)
            bcc: Liste des destinataires en copie cachée (optionnel)
            sender: Expéditeur personnalisé (optionnel)
        
        Returns:
            bool: True si l'email a été envoyé avec succès
        """
        try:
            # Charger le template
            template_content = self._get_email_template(template_name)
            if not template_content:
                logger.error(f"Template '{template_name}' non trouvé")
                return False
            
            # Rendu du template
            template = Template(template_content['html'])
            html_body = template.render(**template_data)
            
            # Corps en texte brut (version simplifiée)
            text_template = Template(template_content.get('text', template_content['html']))
            text_body = text_template.render(**template_data)
            
            return self.send_email(
                to=to,
                subject=subject,
                body=text_body,
                html_body=html_body,
                cc=cc,
                bcc=bcc,
                sender=sender
            )
            
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'email template: {str(e)}")
            return False
    
    def send_notification_email(
        self,
        user_email: str,
        notification_type: str,
        data: Dict[str, Any]
    ) -> bool:
        """
        Envoie un email de notification basé sur le type
        
        Args:
            user_email: Email du destinataire
            notification_type: Type de notification
            data: Données de la notification
        
        Returns:
            bool: True si l'email a été envoyé avec succès
        """
        notification_templates = {
            'document_uploaded': {
                'subject': 'Nouveau document ajouté - {document_title}',
                'template': 'document_notification'
            },
            'document_updated': {
                'subject': 'Document modifié - {document_title}',
                'template': 'document_notification'
            },
            'document_shared': {
                'subject': 'Document partagé avec vous - {document_title}',
                'template': 'document_shared'
            },
            'workflow_assigned': {
                'subject': 'Nouvelle tâche assignée - {workflow_title}',
                'template': 'workflow_notification'
            },
            'user_created': {
                'subject': 'Bienvenue sur ArchiFlow',
                'template': 'welcome'
            },
            'password_reset': {
                'subject': 'Réinitialisation de votre mot de passe',
                'template': 'password_reset'
            }
        }
        
        if notification_type not in notification_templates:
            logger.error(f"Type de notification '{notification_type}' non supporté")
            return False
        
        template_info = notification_templates[notification_type]
        subject = template_info['subject'].format(**data)
        
        return self.send_template_email(
            to=[user_email],
            template_name=template_info['template'],
            subject=subject,
            template_data=data
        )
    
    def test_connection(self) -> Dict[str, Any]:
        """
        Teste la connexion SMTP
        
        Returns:
            dict: Résultat du test avec statut et message
        """
        if not self.is_configured():
            return {
                'success': False,
                'message': 'Configuration email incomplète'
            }
        
        try:
            with self.mail.connect() as conn:
                # Test de connexion simple
                pass
            
            return {
                'success': True,
                'message': 'Connexion SMTP réussie'
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erreur de connexion SMTP: {str(e)}'
            }
    
    def _get_email_template(self, template_name: str) -> Optional[Dict[str, str]]:
        """Récupère un template d'email depuis la base de données ou les fichiers"""
        try:
            conn = db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Vérifier si la table des templates existe
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'email_templates'
                );
            """)
            
            table_exists = cursor.fetchone()['exists']
            
            if table_exists:
                cursor.execute("""
                    SELECT html_content, text_content 
                    FROM email_templates 
                    WHERE name = %s AND is_active = true
                """, (template_name,))
                
                template = cursor.fetchone()
                if template:
                    cursor.close()
                    conn.close()
                    return {
                        'html': template['html_content'],
                        'text': template['text_content']
                    }
            
            cursor.close()
            conn.close()
            
            # Fallback vers les templates par défaut
            default_templates = self._get_default_templates()
            return default_templates.get(template_name)
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du template: {str(e)}")
            default_templates = self._get_default_templates()
            return default_templates.get(template_name)
    
    def _get_default_templates(self) -> Dict[str, Dict[str, str]]:
        """Templates d'email par défaut"""
        return {
            'welcome': {
                'subject': 'Bienvenue sur ArchiFlow - Votre compte a été créé',
                'html': '''
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0; font-size: 24px;">🎉 Bienvenue sur ArchiFlow</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Votre compte a été créé avec succès</p>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 30px;">
                            <p style="font-size: 16px; margin-bottom: 20px;">Bonjour <strong>{{user_name}}</strong>,</p>
                            
                            <p>Votre compte ArchiFlow a été créé par un administrateur. Voici vos informations de connexion :</p>
                            
                            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <h3 style="color: #495057; margin-top: 0;">🔐 Vos informations de connexion</h3>
                                <p><strong>Email :</strong> {{user_email}}</p>
                                <p><strong>Mot de passe temporaire :</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">{{generated_password}}</code></p>
                                <p><strong>Rôle :</strong> {{user_role}}</p>
                            </div>
                            
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                <p style="margin: 0; color: #856404;"><strong>⚠️ Important :</strong> Nous vous recommandons fortement de changer votre mot de passe lors de votre première connexion.</p>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{login_url}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">Se connecter maintenant</a>
                            </div>
                            
                            <p>Si vous avez des questions, n'hésitez pas à contacter l'équipe d'administration.</p>
                            
                            <p>Cordialement,<br><strong>L'équipe ArchiFlow</strong></p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #f8f9fa; text-align: center; padding: 20px; border-radius: 0 0 10px 10px; border-top: 1px solid #dee2e6;">
                            <p style="margin: 0; color: #6c757d; font-size: 14px;">© 2025 ArchiFlow - Système de Gestion Électronique de Documents</p>
                        </div>
                    </div>
                </body>
                </html>
                ''',
                'text': '''Bienvenue sur ArchiFlow !

Bonjour {{user_name}},

Votre compte ArchiFlow a été créé par un administrateur.

Vos informations de connexion :
- Email : {{user_email}}
- Mot de passe temporaire : {{generated_password}}
- Rôle : {{user_role}}

IMPORTANT : Nous vous recommandons de changer votre mot de passe lors de votre première connexion.

Connectez-vous ici : {{login_url}}

Cordialement,
L'équipe ArchiFlow'''
            },
            
            'password_reset': {
                'subject': 'Réinitialisation de votre mot de passe - ArchiFlow',
                'html': '''
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #333; text-align: center; padding: 30px; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0; font-size: 24px;">🔒 Réinitialisation de mot de passe</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.8;">Votre nouveau mot de passe temporaire</p>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 30px;">
                            <p style="font-size: 16px; margin-bottom: 20px;">Bonjour <strong>{{user_name}}</strong>,</p>
                            
                            <p>Votre mot de passe a été réinitialisé. Voici votre nouveau mot de passe temporaire :</p>
                            
                            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                                <h3 style="color: #495057; margin-top: 0;">🔑 Nouveau mot de passe</h3>
                                <p style="font-size: 18px; font-family: monospace; background: #e9ecef; padding: 10px; border-radius: 4px; letter-spacing: 1px;"><strong>{{new_password}}</strong></p>
                            </div>
                            
                            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                <p style="margin: 0; color: #155724;"><strong>🛡️ Sécurité :</strong> Pour votre sécurité, changez ce mot de passe dès votre prochaine connexion.</p>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{login_url}}" style="display: inline-block; background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #333; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">Se connecter avec le nouveau mot de passe</a>
                            </div>
                            
                            <p style="color: #6c757d; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement l'administrateur.</p>
                            
                            <p>Cordialement,<br><strong>L'équipe ArchiFlow</strong></p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #f8f9fa; text-align: center; padding: 20px; border-radius: 0 0 10px 10px; border-top: 1px solid #dee2e6;">
                            <p style="margin: 0; color: #6c757d; font-size: 14px;">© 2025 ArchiFlow - Système de Gestion Électronique de Documents</p>
                        </div>
                    </div>
                </body>
                </html>
                ''',
                'text': '''Réinitialisation de votre mot de passe - ArchiFlow

Bonjour {{user_name}},

Votre mot de passe a été réinitialisé.

Nouveau mot de passe temporaire : {{new_password}}

IMPORTANT : Pour votre sécurité, changez ce mot de passe dès votre prochaine connexion.

Connectez-vous ici : {{login_url}}

Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement l'administrateur.

Cordialement,
L'équipe ArchiFlow'''
            },
            
            'document_notification': {
                'subject': 'Nouveau document - {{document_title}}',
                'html': '''
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white; text-align: center; padding: 30px; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0; font-size: 24px;">📄 Nouveau Document</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Un document a été ajouté</p>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 30px;">
                            <p style="font-size: 16px; margin-bottom: 20px;">Bonjour <strong>{{user_name}}</strong>,</p>
                            
                            <p>Un nouveau {{document_type}} a été {{action}} dans le système :</p>
                            
                            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <h3 style="color: #495057; margin-top: 0;">📋 Détails du document</h3>
                                <p><strong>Titre :</strong> {{document_title}}</p>
                                <p><strong>Type :</strong> {{document_type}}</p>
                                <p><strong>Ajouté par :</strong> {{uploader_name}}</p>
                                <p><strong>Date :</strong> {{date}}</p>
                                {% if description %}
                                <p><strong>Description :</strong> {{description}}</p>
                                {% endif %}
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{login_url}}" style="display: inline-block; background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">Voir le document</a>
                            </div>
                            
                            <p>Cordialement,<br><strong>L'équipe ArchiFlow</strong></p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #f8f9fa; text-align: center; padding: 20px; border-radius: 0 0 10px 10px; border-top: 1px solid #dee2e6;">
                            <p style="margin: 0; color: #6c757d; font-size: 14px;">© 2025 ArchiFlow - Système de Gestion Électronique de Documents</p>
                        </div>
                    </div>
                </body>
                </html>
                ''',
                'text': '''Nouveau Document - ArchiFlow

Bonjour {{user_name}},

Un nouveau {{document_type}} a été {{action}} dans le système :

Détails :
- Titre : {{document_title}}
- Type : {{document_type}}
- Ajouté par : {{uploader_name}}
- Date : {{date}}
{% if description %}- Description : {{description}}{% endif %}

Connectez-vous pour voir le document : {{login_url}}

Cordialement,
L'équipe ArchiFlow'''
            },
            
            'document_shared': {
                'subject': 'Document partagé avec vous - {{document_title}}',
                'html': '''
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); color: white; text-align: center; padding: 30px; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0; font-size: 24px;">🤝 Document Partagé</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Un document a été partagé avec vous</p>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 30px;">
                            <p style="font-size: 16px; margin-bottom: 20px;">Bonjour <strong>{{user_name}}</strong>,</p>
                            
                            <p><strong>{{shared_by_name}}</strong> a partagé un document avec vous :</p>
                            
                            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <h3 style="color: #495057; margin-top: 0;">📄 Document partagé</h3>
                                <p><strong>Titre :</strong> {{document_title}}</p>
                                <p><strong>Partagé par :</strong> {{shared_by_name}}</p>
                                <p><strong>Date :</strong> {{date}}</p>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{login_url}}" style="display: inline-block; background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">Voir les documents partagés</a>
                            </div>
                            
                            <p>Cordialement,<br><strong>L'équipe ArchiFlow</strong></p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #f8f9fa; text-align: center; padding: 20px; border-radius: 0 0 10px 10px; border-top: 1px solid #dee2e6;">
                            <p style="margin: 0; color: #6c757d; font-size: 14px;">© 2025 ArchiFlow - Système de Gestion Électronique de Documents</p>
                        </div>
                    </div>
                </body>
                </html>
                ''',
                'text': '''Document partagé avec vous - ArchiFlow

Bonjour {{user_name}},

{{shared_by_name}} a partagé un document avec vous :

Document :
- Titre : {{document_title}}
- Partagé par : {{shared_by_name}}
- Date : {{date}}

Voir les documents partagés : {{login_url}}

Cordialement,
L'équipe ArchiFlow'''
            },
            
            'workflow_notification': {
                'subject': 'Nouvelle tâche assignée - {{workflow_title}}',
                'html': '''
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%); color: #333; text-align: center; padding: 30px; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0; font-size: 24px;">⚡ Nouvelle Tâche</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.8;">Un workflow vous a été assigné</p>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 30px;">
                            <p style="font-size: 16px; margin-bottom: 20px;">Bonjour <strong>{{user_name}}</strong>,</p>
                            
                            <p>Une nouvelle tâche vous a été assignée par <strong>{{assigner_name}}</strong> :</p>
                            
                            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <h3 style="color: #495057; margin-top: 0;">🔄 Détails de la tâche</h3>
                                <p><strong>Workflow :</strong> {{workflow_title}}</p>
                                <p><strong>Assigné par :</strong> {{assigner_name}}</p>
                                <p><strong>Date :</strong> {{date}}</p>
                            </div>
                            
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                <p style="margin: 0; color: #856404;"><strong>⏰ Action requise :</strong> Connectez-vous pour traiter cette tâche dans les délais impartis.</p>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{login_url}}" style="display: inline-block; background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%); color: #333; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">Voir la tâche</a>
                            </div>
                            
                            <p>Cordialement,<br><strong>L'équipe ArchiFlow</strong></p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #f8f9fa; text-align: center; padding: 20px; border-radius: 0 0 10px 10px; border-top: 1px solid #dee2e6;">
                            <p style="margin: 0; color: #6c757d; font-size: 14px;">© 2025 ArchiFlow - Système de Gestion Électronique de Documents</p>
                        </div>
                    </div>
                </body>
                </html>
                ''',
                'text': '''Nouvelle tâche assignée - ArchiFlow

Bonjour {{user_name}},

Une nouvelle tâche vous a été assignée par {{assigner_name}} :

Détails :
- Workflow : {{workflow_title}}
- Assigné par : {{assigner_name}}
- Date : {{date}}

ACTION REQUISE : Connectez-vous pour traiter cette tâche dans les délais impartis.

Voir la tâche : {{login_url}}

Cordialement,
L'équipe ArchiFlow'''
            },
            
            'test': {
                'subject': 'Test de configuration email - ArchiFlow',
                'html': '''
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2c3e50;">✅ Test de Configuration Email</h2>
                        <p>Félicitations ! Votre configuration email fonctionne parfaitement.</p>
                        <p><strong>Date du test :</strong> {{test_date}}</p>
                        <p><strong>Serveur SMTP :</strong> {{smtp_server}}</p>
                        <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #155724;">🎉 Votre système d'email est opérationnel et prêt à envoyer des notifications !</p>
                        </div>
                        <p>Cordialement,<br>L'équipe ArchiFlow</p>
                    </div>
                </body>
                </html>
                ''',
                'text': '''Test de Configuration Email - ArchiFlow

Félicitations ! Votre configuration email fonctionne parfaitement.

Date du test : {{test_date}}
Serveur SMTP : {{smtp_server}}

Votre système d'email est opérationnel et prêt à envoyer des notifications !

Cordialement,
L'équipe ArchiFlow'''
            }
        }
    
    def _log_email_sent(self, recipients: List[str], subject: str, sender: Optional[str]):
        """Enregistre l'envoi d'email en base de données"""
        try:
            conn = db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Vérifier si la table des logs existe
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'email_logs'
                );
            """)
            
            table_exists = cursor.fetchone()['exists']
            
            if not table_exists:
                # Créer la table si elle n'existe pas
                cursor.execute("""
                    CREATE TABLE email_logs (
                        id SERIAL PRIMARY KEY,
                        recipients TEXT NOT NULL,
                        subject VARCHAR(255) NOT NULL,
                        sender VARCHAR(255),
                        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        status VARCHAR(20) DEFAULT 'sent'
                    );
                """)
                conn.commit()
            
            # Enregistrer l'envoi
            cursor.execute("""
                INSERT INTO email_logs (recipients, subject, sender)
                VALUES (%s, %s, %s)
            """, (
                ', '.join(recipients),
                subject,
                sender or EmailConfig.MAIL_DEFAULT_SENDER
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement du log email: {str(e)}")

# Instance globale du service
email_service = EmailService() 