package services

import (
	"fmt"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
)

const (
	NotifTypeWorkflowPending   = "WORKFLOW_PENDING"
	NotifTypeWorkflowApproved  = "WORKFLOW_APPROVED"
	NotifTypeWorkflowRejected  = "WORKFLOW_REJECTED"
	NotifTypeWorkflowCancelled = "WORKFLOW_CANCELLED"
	NotifTypeWorkflowAdvanced  = "WORKFLOW_STEP"
)

type NotificationService struct {
	collab    *repository.CollaborationRepository
	email     *EmailService
	users     repository.UserRepository
	realtime  *NotificationRealtime
}

func NewNotificationService(
	collab *repository.CollaborationRepository,
	email *EmailService,
	users repository.UserRepository,
	rt *NotificationRealtime,
) *NotificationService {
	return &NotificationService{collab: collab, email: email, users: users, realtime: rt}
}

func (s *NotificationService) Send(userID uint, typ, title, message, link string) error {
	if userID == 0 {
		return nil
	}
	n := &models.Notification{
		UserID:  userID,
		Type:    typ,
		Title:   title,
		Message: message,
		Link:    link,
	}
	if err := s.collab.CreateNotification(n); err != nil {
		return err
	}
	if s.realtime != nil {
		s.realtime.Publish(userID, *n)
	}
	if s.email != nil && s.users != nil {
		if u, err := s.users.GetByID(userID); err == nil && u.Email != "" {
			s.email.Send(u.Email, title, fmt.Sprintf("%s\n\n%s", message, link))
		}
	}
	return nil
}

func (s *NotificationService) SendMany(userIDs []uint, typ, title, message, link string) {
	seen := make(map[uint]struct{}, len(userIDs))
	for _, id := range userIDs {
		if id == 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		_ = s.Send(id, typ, title, message, link)
	}
}
