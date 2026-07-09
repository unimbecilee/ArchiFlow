package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"

	"github.com/redis/go-redis/v9"
)

// PolicyService = cache + ABAC policies table au-dessus de CanAccess (déjà MAC+département).
type PolicyService struct {
	collab   *CollaborationService
	docRepo  *repository.DocumentRepository
	userRepo repository.UserRepository
	sftpRepo *repository.SftpRepository
	rdb      *redis.Client
}

func NewPolicyService(
	collab *CollaborationService,
	docRepo *repository.DocumentRepository,
	userRepo repository.UserRepository,
	sftpRepo *repository.SftpRepository,
) *PolicyService {
	return &PolicyService{
		collab:   collab,
		docRepo:  docRepo,
		userRepo: userRepo,
		sftpRepo: sftpRepo,
		rdb:      config.RedisClient(),
	}
}

const (
	ActionRead  = "read"
	ActionWrite = "write"
	ActionShare = "share"
	policyTTL   = 30 * time.Second
)

// Can évalue CanAccess (RBAC+ACL+MAC) puis policies ABAC optionnelles, avec cache Redis.
func (p *PolicyService) Can(userID uint, role string, docID uint, action string) (bool, []string, error) {
	if cached, perms, ok := p.cacheGet(userID, docID, action); ok {
		return cached, perms, nil
	}

	ok, perms, err := p.collab.CanAccess(docID, userID, role)
	if err != nil || !ok {
		p.cacheSet(userID, docID, action, false, nil)
		return false, nil, err
	}

	need := models.PermRead
	switch action {
	case ActionWrite:
		need = models.PermWrite
	case ActionShare:
		need = models.PermShare
	case ActionRead:
		need = models.PermRead
	}
	allowed := p.collab.requirePerm(perms, need)
	if action == ActionRead && !allowed {
		allowed = p.collab.requirePerm(perms, models.PermDownload) || p.collab.requirePerm(perms, models.PermRead)
	}
	if !allowed {
		p.cacheSet(userID, docID, action, false, perms)
		return false, perms, nil
	}

	if p.sftpRepo != nil {
		user, uerr := p.userRepo.GetByID(userID)
		doc, derr := p.docRepo.FindByID(docID)
		if uerr == nil && derr == nil {
			policies, _ := p.sftpRepo.ListAccessPolicies()
			for _, pol := range policies {
				if !policyMatchesAction(pol.Actions, action) {
					continue
				}
				if !evalPolicyCondition(pol.Condition, user, doc) {
					continue
				}
				if strings.EqualFold(pol.Effect, "deny") {
					p.cacheSet(userID, docID, action, false, perms)
					return false, perms, nil
				}
				if strings.EqualFold(pol.Effect, "allow") {
					p.cacheSet(userID, docID, action, true, perms)
					return true, perms, nil
				}
			}
		}
	}

	p.cacheSet(userID, docID, action, true, perms)
	return true, perms, nil
}

func (p *PolicyService) EnsureCan(userID uint, role string, docID uint, action string) error {
	ok, _, err := p.Can(userID, role, docID, action)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("forbidden")
	}
	return nil
}

// InvalidateCache after share / role change.
func (p *PolicyService) InvalidateCache(userID, docID uint) {
	if p.rdb == nil {
		return
	}
	ctx := context.Background()
	for _, a := range []string{ActionRead, ActionWrite, ActionShare} {
		_ = p.rdb.Del(ctx, policyCacheKey(userID, docID, a)).Err()
	}
}

func policyCacheKey(userID, docID uint, action string) string {
	return fmt.Sprintf("policy:%d:%d:%s", userID, docID, action)
}

type policyCacheVal struct {
	OK    bool     `json:"ok"`
	Perms []string `json:"perms"`
}

func (p *PolicyService) cacheGet(userID, docID uint, action string) (bool, []string, bool) {
	if p.rdb == nil {
		return false, nil, false
	}
	raw, err := p.rdb.Get(context.Background(), policyCacheKey(userID, docID, action)).Bytes()
	if err != nil {
		return false, nil, false
	}
	var v policyCacheVal
	if json.Unmarshal(raw, &v) != nil {
		return false, nil, false
	}
	return v.OK, v.Perms, true
}

func (p *PolicyService) cacheSet(userID, docID uint, action string, ok bool, perms []string) {
	if p.rdb == nil {
		return
	}
	b, _ := json.Marshal(policyCacheVal{OK: ok, Perms: perms})
	_ = p.rdb.Set(context.Background(), policyCacheKey(userID, docID, action), b, policyTTL).Err()
}

func policyMatchesAction(raw, action string) bool {
	if raw == "" {
		return true
	}
	var actions []string
	if err := json.Unmarshal([]byte(raw), &actions); err != nil {
		return strings.Contains(raw, action)
	}
	for _, a := range actions {
		if a == action || a == "*" {
			return true
		}
	}
	return false
}

func evalPolicyCondition(raw string, user *models.User, doc *models.Document) bool {
	if strings.TrimSpace(raw) == "" {
		return true
	}
	var cond map[string]any
	if err := json.Unmarshal([]byte(raw), &cond); err != nil {
		return false
	}
	attr, _ := cond["attr"].(string)
	op, _ := cond["op"].(string)
	val, _ := cond["value"].(string)

	left := ""
	switch attr {
	case "doc.department":
		left = doc.Department
	case "user.department":
		left = user.Department
	case "doc.classification":
		left = doc.Classification
	case "user.clearance":
		left = user.ClearanceLevel
	case "doc.owner_id":
		left = strconv.FormatUint(uint64(doc.OwnerID), 10)
	default:
		return false
	}
	right := val
	if strings.HasPrefix(val, "$user.") {
		switch val {
		case "$user.department":
			right = user.Department
		case "$user.clearance":
			right = user.ClearanceLevel
		case "$user.id":
			right = strconv.FormatUint(uint64(user.ID), 10)
		}
	}
	switch op {
	case "eq", "==", "":
		return strings.EqualFold(left, right)
	case "neq", "!=":
		return !strings.EqualFold(left, right)
	default:
		return false
	}
}
