import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'votre_cle_secrete_ici'
    UPLOAD_FOLDER = os.path.join(basedir, '../uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # Limite de 16MB

# Configuration Email ESAG GED - Gmail
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True") == "True"
MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "False") == "True"
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", MAIL_USERNAME or "")

# Configuration SMTP alternative
SMTP_SERVER = os.getenv("SMTP_SERVER", MAIL_SERVER)
SMTP_PORT = int(os.getenv("SMTP_PORT", str(MAIL_PORT)))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", MAIL_USERNAME or "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", MAIL_PASSWORD or "")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "True") == "True"
EMAIL_FROM = os.getenv("EMAIL_FROM", MAIL_DEFAULT_SENDER or "")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "ESAG GED")

# Définir les variables d'environnement pour que le service email les trouve
