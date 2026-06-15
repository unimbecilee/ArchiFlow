package realtime

import "time"

// Broker publie des événements temps réel (hub mémoire ou Redis en phase 2).
type Broker interface {
	PublishToUser(userID uint, env Envelope)
}

type HubBroker struct {
	hub *Hub
}

func NewHubBroker(hub *Hub) *HubBroker {
	return &HubBroker{hub: hub}
}

func (b *HubBroker) PublishToUser(userID uint, env Envelope) {
	if b == nil || b.hub == nil {
		return
	}
	if env.V == 0 {
		env.V = 1
	}
	if env.TS == 0 {
		env.TS = time.Now().Unix()
	}
	b.hub.PublishToUser(userID, env)
}
