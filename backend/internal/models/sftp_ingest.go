package models

import "time"

const (
	SftpIngestPending  = "pending"
	SftpIngestIngested = "ingested"
	SftpIngestFailed   = "failed"
	SftpIngestRejected = "rejected"
)

// SftpIngestEvent piste la promotion staging SFTP → document canonique.
type SftpIngestEvent struct {
	ID              uint      `gorm:"primarykey" json:"id"`
	OwnerID         uint      `gorm:"index;not null" json:"owner_id"`
	StagingBucket   string    `gorm:"size:100" json:"staging_bucket"`
	StagingKey      string    `gorm:"size:500;index" json:"staging_key"`
	CanonicalBucket string    `gorm:"size:100" json:"canonical_bucket"`
	CanonicalKey    string    `gorm:"size:500" json:"canonical_key"`
	DocumentID      *uint     `gorm:"index" json:"document_id,omitempty"`
	Status          string    `gorm:"size:32;default:pending;index" json:"status"`
	SourceProtocol  string    `gorm:"size:32" json:"source_protocol"`
	FileName        string    `gorm:"size:1024" json:"file_name"`
	Size            int64     `json:"size"`
	MimeType        string    `gorm:"size:255" json:"mime_type"`
	IdempotencyKey  string    `gorm:"size:255;uniqueIndex" json:"idempotency_key"`
	ErrorMessage    string    `gorm:"type:text" json:"error_message,omitempty"`
	CorrelationID   string    `gorm:"size:64;index" json:"correlation_id"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (SftpIngestEvent) TableName() string { return "sftp_ingest_events" }

// ServiceAccount compte M2M lié à un user ArchiFlow (accès SFTP machine).
type ServiceAccount struct {
	ID              uint       `gorm:"primarykey" json:"id"`
	Name            string     `gorm:"size:100;not null" json:"name"`
	ArchiflowUserID uint       `gorm:"index;not null" json:"archiflow_user_id"`
	SftpGoUsername  string     `gorm:"size:100;uniqueIndex" json:"sftpgo_username"`
	PasswordHash    string     `gorm:"not null" json:"-"`
	Description     string     `gorm:"type:text" json:"description"`
	// SftpMode: drop (défaut) ou full. inbox non autorisé pour M2M → normalisé en drop.
	SftpMode   string     `gorm:"size:16;default:drop" json:"sftp_mode"`
	IsActive   bool       `gorm:"default:true" json:"is_active"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

func (ServiceAccount) TableName() string { return "service_accounts" }

// Classification MAC simplifiée (3 niveaux).
const (
	ClassificationPublic       = "PUBLIC"
	ClassificationInternal     = "INTERNE"
	ClassificationConfidential = "CONFIDENTIEL"
)

// ClearanceLevelOrder pour comparaison MAC (plus haut = plus sensible).
func ClearanceRank(level string) int {
	switch level {
	case ClassificationPublic:
		return 1
	case ClassificationInternal:
		return 2
	case ClassificationConfidential:
		return 3
	default:
		return 2
	}
}

// AuditEvent journal unifié API + SFTPGo.
type AuditEvent struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	Source        string    `gorm:"size:32;index;not null" json:"source"` // api | sftpgo
	ActorID       *uint     `gorm:"index" json:"actor_id,omitempty"`
	ActorEmail    string    `gorm:"size:255" json:"actor_email"`
	Action        string    `gorm:"size:64;index;not null" json:"action"`
	ResourceType  string    `gorm:"size:64;index" json:"resource_type"`
	ResourceID    string    `gorm:"size:128" json:"resource_id"`
	IP            string    `gorm:"size:64" json:"ip"`
	CorrelationID string    `gorm:"size:64;index" json:"correlation_id"`
	Metadata      string    `gorm:"type:text" json:"metadata,omitempty"`
	CreatedAt     time.Time `gorm:"index" json:"created_at"`
	PrevHash      string    `gorm:"type:varchar(64);not null;default:''" json:"-"`
	EntryHash     string    `gorm:"type:varchar(64);not null;default:''" json:"-"`
}

func (AuditEvent) TableName() string { return "audit_events" }

// AccessPolicy ABAC optionnel (phase 2).
type AccessPolicy struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	Effect    string    `gorm:"size:16;not null" json:"effect"` // allow | deny
	Priority  int       `gorm:"default:100" json:"priority"`
	Condition string    `gorm:"type:text" json:"condition"` // JSON
	Actions   string    `gorm:"type:text" json:"actions"`   // JSON array
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (AccessPolicy) TableName() string { return "access_policies" }
