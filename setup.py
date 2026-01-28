"""Setup script for ESAG GED application"""
from setuptools import setup, find_packages

setup(
    name="esag-ged",
    version="1.0.0",
    description="Système de Gestion Électronique de Documents (GED)",
    author="ESAG",
    packages=find_packages(),
    install_requires=[
        # Core Flask
        "Flask==3.0.2",
        "Flask-CORS==4.0.0",
        "Flask-SQLAlchemy==3.1.1",
        "python-dotenv==1.0.1",
        
        # Database
        "psycopg2-binary==2.9.10",
        "SQLAlchemy==2.0.41",
        "alembic==1.13.1",
        
        # File handling
        "cloudinary==1.38.0",
        "Werkzeug==3.0.1",
        "Pillow==10.4.0",
        
        # Document processing
        "python-docx==1.1.0",
        "mammoth==1.7.1",
        "PyPDF2==3.0.1",
        "pdf2image==1.17.0",
        "pytesseract==0.3.10",
        "opencv-python==4.11.0.86",
        "PyMuPDF==1.26.1",
        
        # Security
        "PyJWT==2.8.0",
        "bcrypt==4.1.2",
        "cryptography==42.0.2",
        
        # Utilities
        "python-dateutil==2.8.2",
        "requests==2.31.0",
        "pytz==2024.1",
    ],
    extras_require={
        "dev": [
            "pytest==8.0.0",
            "black==24.1.1",
            "flake8==7.0.0",
        ],
    },
    python_requires=">=3.8",
)

