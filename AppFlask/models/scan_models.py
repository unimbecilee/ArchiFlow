"""
Modèles de données pour le système de scanner
"""
from datetime import datetime
from typing import Optional, List
import json

class ScannerDevice:
    """Modèle pour un périphérique scanner"""
    
    def __init__(self, scanner_id: str, name: str, manufacturer: str, 
                 scanner_type: str, connection: str, os_type: str, available: bool = True):
        self.id = scanner_id
        self.name = name
        self.manufacturer = manufacturer
        self.type = scanner_type
        self.connection = connection
        self.os = os_type
        self.available = available
        self.last_seen = datetime.now()
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'manufacturer': self.manufacturer,
            'type': self.type,
            'connection': self.connection,
            'os': self.os,
            'available': self.available,
            'last_seen': self.last_seen.isoformat()
        }


class ScanTask:
    """Modèle pour une tâche de scan"""
    
    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'
    STATUS_CANCELLED = 'cancelled'
    
    def __init__(self, task_id: str, utilisateur_id: int, scanner_id: str,
                 settings: dict, status: str = STATUS_PENDING):
        self.id = task_id
        self.utilisateur_id = utilisateur_id
        self.scanner_id = scanner_id
        self.settings = settings
        self.status = status
        self.created_at = datetime.now()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.progress = 0
        self.total_pages = 0
        self.processed_pages = 0
        self.error_message: Optional[str] = None
        self.result_data: Optional[dict] = None
    
    def to_dict(self):
        return {
            'id': self.id,
            'utilisateur_id': self.utilisateur_id,
            'scanner_id': self.scanner_id,
            'settings': self.settings,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'progress': self.progress,
            'total_pages': self.total_pages,
            'processed_pages': self.processed_pages,
            'error_message': self.error_message,
            'result_data': self.result_data
        }


class ScanPage:
    """Modèle pour une page scannée"""
    
    def __init__(self, page_id: str, task_id: str, page_number: int,
                 original_path: str, processed_path: Optional[str] = None):
        self.id = page_id
        self.task_id = task_id
        self.page_number = page_number
        self.original_path = original_path
        self.processed_path = processed_path
        self.ocr_text: Optional[str] = None
        self.metadata: dict = {}
        self.created_at = datetime.now()
        self.processed_at: Optional[datetime] = None
    
    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'page_number': self.page_number,
            'original_path': self.original_path,
            'processed_path': self.processed_path,
            'ocr_text': self.ocr_text,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat(),
            'processed_at': self.processed_at.isoformat() if self.processed_at else None
        }


# SQL pour créer les tables dans PostgreSQL
SQL_CREATE_TABLES = """
-- Table pour les tâches de scan
CREATE TABLE IF NOT EXISTS scan_task (
    id VARCHAR(255) PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateur(id),
    scanner_id VARCHAR(255) NOT NULL,
    settings JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    progress INTEGER NOT NULL DEFAULT 0,
    total_pages INTEGER NOT NULL DEFAULT 0,
    processed_pages INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    result_data JSONB
);

-- Table pour les pages scannées
CREATE TABLE IF NOT EXISTS scan_page (
    id VARCHAR(255) PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL REFERENCES scan_task(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    original_path VARCHAR(1000) NOT NULL,
    processed_path VARCHAR(1000),
    ocr_text TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Table pour les périphériques scanner (cache)
CREATE TABLE IF NOT EXISTS scanner_device (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    manufacturer VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    connection VARCHAR(50) NOT NULL,
    os VARCHAR(50) NOT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_scan_task_utilisateur ON scan_task(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_scan_task_status ON scan_task(status);
CREATE INDEX IF NOT EXISTS idx_scan_task_created ON scan_task(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_page_task ON scan_page(task_id);
CREATE INDEX IF NOT EXISTS idx_scan_page_number ON scan_page(page_number);
CREATE INDEX IF NOT EXISTS idx_scanner_device_available ON scanner_device(available);
"""
