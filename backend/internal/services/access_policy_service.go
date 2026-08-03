package services

import (
	"fmt"
	"strings"

	"archiflow/backend/internal/authz"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
)

type AccessPolicyService struct {
	repo   *repository.SftpRepository
	policy *PolicyService
}

func NewAccessPolicyService(repo *repository.SftpRepository, policy *PolicyService) *AccessPolicyService {
	return &AccessPolicyService{repo: repo, policy: policy}
}

func (s *AccessPolicyService) List() ([]models.AccessPolicy, error) {
	return s.repo.ListAllAccessPoliciesAdmin()
}

type AccessPolicyInput struct {
	Name      string
	Effect    string
	Priority  int
	Condition string
	Actions   string
	Active    bool
}

func (s *AccessPolicyService) Create(in AccessPolicyInput) (*models.AccessPolicy, error) {
	if err := validateAccessPolicyInput(in); err != nil {
		return nil, err
	}
	p := &models.AccessPolicy{
		Name:      in.Name,
		Effect:    strings.ToLower(in.Effect),
		Priority:  in.Priority,
		Condition: in.Condition,
		Actions:   in.Actions,
		Active:    in.Active,
	}
	if err := s.repo.CreateAccessPolicy(p); err != nil {
		return nil, err
	}
	s.invalidateCaches()
	return p, nil
}

func (s *AccessPolicyService) Update(id uint, in AccessPolicyInput) (*models.AccessPolicy, error) {
	p, err := s.repo.FindAccessPolicyByID(id)
	if err != nil {
		return nil, err
	}
	if err := validateAccessPolicyInput(in); err != nil {
		return nil, err
	}
	p.Name = in.Name
	p.Effect = strings.ToLower(in.Effect)
	p.Priority = in.Priority
	p.Condition = in.Condition
	p.Actions = in.Actions
	p.Active = in.Active
	if err := s.repo.UpdateAccessPolicy(p); err != nil {
		return nil, err
	}
	s.invalidateCaches()
	return p, nil
}

func (s *AccessPolicyService) Delete(id uint) error {
	if err := s.repo.DeleteAccessPolicy(id); err != nil {
		return err
	}
	s.invalidateCaches()
	return nil
}

func validateAccessPolicyInput(in AccessPolicyInput) error {
	if strings.TrimSpace(in.Name) == "" {
		return fmt.Errorf("name required")
	}
	switch strings.ToLower(in.Effect) {
	case "allow", "deny":
	default:
		return fmt.Errorf("effect must be allow or deny")
	}
	if err := authz.ValidatePolicyConditionJSON(in.Condition); err != nil {
		return fmt.Errorf("invalid condition JSON")
	}
	return nil
}

func (s *AccessPolicyService) invalidateCaches() {
	if s.policy != nil {
		s.policy.InvalidateAllPolicyCaches()
	}
}
