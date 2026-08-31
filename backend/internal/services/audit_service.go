package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
)

// AuditService journal unifié API + SFTPGo.
type AuditService struct {
	repo *repository.SftpRepository
}

func NewAuditService(repo *repository.SftpRepository) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) Log(e models.AuditEvent) error {
	if s == nil || s.repo == nil {
		return nil
	}
	if e.EntryHash == "" {
		return s.repo.InsertAuditChained(&e, func(prev string) string {
			return hashAuditEntry(e, prev)
		})
	}
	return s.repo.CreateAudit(&e)
}

func hashAuditEntry(e models.AuditEvent, prev string) string {
	var actor string
	if e.ActorID != nil {
		actor = strconv.FormatUint(uint64(*e.ActorID), 10)
	}
	parts := []string{
		"audit",
		"1",
		e.Source,
		actor,
		e.ActorEmail,
		e.Action,
		e.ResourceType,
		e.ResourceID,
		e.IP,
		e.CorrelationID,
		e.Metadata,
		strconv.FormatInt(e.CreatedAt.UnixNano(), 10),
		prev,
	}
	canonical := strings.Join(parts, "\x1f")
	sum := sha256.Sum256([]byte(canonical))
	return hex.EncodeToString(sum[:])
}

type AuditVerifyResult struct {
	Checked    int
	Mismatches int
	FirstBadID uint
}

func (s *AuditService) VerifyChain(ctx context.Context) (AuditVerifyResult, error) {
	res := AuditVerifyResult{}
	if s == nil || s.repo == nil {
		return res, fmt.Errorf("audit désactivé")
	}
	err := s.repo.AuditChainWalk(ctx, 500, func(e models.AuditEvent) error {
		if e.EntryHash == "" {
			return nil
		}
		res.Checked++
		want := hashAuditEntry(e, e.PrevHash)
		if want != e.EntryHash {
			res.Mismatches++
			if res.FirstBadID == 0 {
				res.FirstBadID = e.ID
			}
		}
		return nil
	})
	return res, err
}
