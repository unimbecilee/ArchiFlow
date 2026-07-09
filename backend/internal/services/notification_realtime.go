package services

import (
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/realtime"
)

// NotificationRealtime pousse les mises à jour vers WebSocket.
type NotificationRealtime struct {
	collab *repository.CollaborationRepository
	broker realtime.Broker
}

func NewNotificationRealtime(collab *repository.CollaborationRepository, broker realtime.Broker) *NotificationRealtime {
	return &NotificationRealtime{collab: collab, broker: broker}
}

func (p *NotificationRealtime) Publish(userID uint, newItems ...models.Notification) {
	if p == nil || p.broker == nil || userID == 0 {
		return
	}
	unread, _ := p.collab.CountUnread(userID)
	unreadShares, _ := p.collab.CountUnreadByType(userID, "SHARE")

	var items any
	if len(newItems) > 0 {
		items = newItems
	}

	p.broker.PublishToUser(userID, realtime.Envelope{
		V:    1,
		Type: realtime.EventNotifications,
		Payload: map[string]any{
			"unread":        unread,
			"unread_shares": unreadShares,
			"items":         items,
		},
	})
}

// PublishDocumentEvent notifie un nouvel événement document (ex. ingest SFTP).
func (p *NotificationRealtime) PublishDocumentEvent(userID uint, event string, documentID uint, title string) {
	if p == nil || p.broker == nil || userID == 0 {
		return
	}
	p.broker.PublishToUser(userID, realtime.Envelope{
		V:    1,
		Type: realtime.EventDocuments,
		Payload: map[string]any{
			"event":       event,
			"document_id": documentID,
			"title":       title,
		},
	})
}
