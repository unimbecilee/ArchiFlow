package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"archiflow/backend/internal/authz"
	"archiflow/backend/internal/config"
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

const policyTTL = 30 * time.Second

var policyCacheActions = []string{
	authz.PolicyAction(authz.ActionRead),
	authz.PolicyAction(authz.ActionWrite),
	authz.PolicyAction(authz.ActionShare),
}

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

	act := authz.Action(action)
	switch act {
	case authz.ActionWrite, authz.ActionShare, authz.ActionComment:
	default:
		act = authz.ActionRead
	}
	if !authz.Satisfies(perms, act) {
		p.cacheSet(userID, docID, action, false, perms)
		return false, perms, nil
	}

	if p.sftpRepo != nil {
		user, uerr := p.userRepo.GetByID(userID)
		doc, derr := p.docRepo.FindByID(docID)
		if uerr == nil && derr == nil {
			policies, _ := p.sftpRepo.ListAccessPolicies()
			if !authz.ApplyAccessPolicies(policies, action, user, doc) {
				p.cacheSet(userID, docID, action, false, perms)
				return false, perms, nil
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

// InvalidateCache clears cached decisions for one user and document.
func (p *PolicyService) InvalidateCache(userID, docID uint) {
	if p.rdb == nil {
		return
	}
	ctx := context.Background()
	for _, a := range policyCacheActions {
		_ = p.rdb.Del(ctx, policyCacheKey(userID, docID, a)).Err()
	}
}

// InvalidateUser clears all cached policy entries for a user (role / clearance change).
func (p *PolicyService) InvalidateUser(userID uint) {
	if p.rdb == nil {
		return
	}
	ctx := context.Background()
	pattern := fmt.Sprintf("policy:%d:*", userID)
	iter := p.rdb.Scan(ctx, 0, pattern, 200).Iterator()
	for iter.Next(ctx) {
		_ = p.rdb.Del(ctx, iter.Val()).Err()
	}
}

// InvalidateAllPolicyCaches clears every policy cache entry (after access_policies CRUD).
func (p *PolicyService) InvalidateAllPolicyCaches() {
	if p.rdb == nil {
		return
	}
	ctx := context.Background()
	iter := p.rdb.Scan(ctx, 0, "policy:*", 500).Iterator()
	for iter.Next(ctx) {
		_ = p.rdb.Del(ctx, iter.Val()).Err()
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
