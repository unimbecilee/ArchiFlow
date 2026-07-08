package services

import (
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/realtime"
	"archiflow/backend/internal/repository"
)

// WorkflowRealtime pousse les compteurs workflow (dashboard, listes).
type WorkflowRealtime struct {
	repo   *repository.WorkflowRepository
	users  repository.UserRepository
	broker realtime.Broker
}

func NewWorkflowRealtime(
	repo *repository.WorkflowRepository,
	users repository.UserRepository,
	broker realtime.Broker,
) *WorkflowRealtime {
	return &WorkflowRealtime{repo: repo, users: users, broker: broker}
}

func (p *WorkflowRealtime) Publish(userID uint, role string) {
	if p == nil || p.broker == nil || userID == 0 {
		return
	}
	pending := int64(0)
	if rows, err := p.repo.ListPendingCandidates(userID); err == nil {
		for i := range rows {
			inst := rows[i]
			if inst.CurrentStep != nil && canApproveFromStep(inst.CurrentStep, userID, role) {
				pending++
			}
		}
	}
	inProgress, _ := p.repo.CountInstancesByStatus(models.WorkflowInstanceInProgress, &userID)

	p.broker.PublishToUser(userID, realtime.Envelope{
		V:    1,
		Type: realtime.EventWorkflows,
		Payload: map[string]any{
			"workflows_pending":     pending,
			"workflows_in_progress": inProgress,
		},
	})
}

func (p *WorkflowRealtime) PublishUsers(userIDs ...uint) {
	if p == nil || p.users == nil {
		return
	}
	seen := make(map[uint]struct{}, len(userIDs))
	for _, id := range userIDs {
		if id == 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		u, err := p.users.GetByID(id)
		if err != nil {
			continue
		}
		p.Publish(id, u.Role)
	}
}
