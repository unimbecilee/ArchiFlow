package realtime

const (
	EventNotifications = "notifications"
	EventWorkflows     = "workflows"
	EventPing          = "ping"
)

// Envelope message WebSocket (v1).
type Envelope struct {
	V       int            `json:"v"`
	Type    string         `json:"type"`
	TS      int64          `json:"ts"`
	Payload map[string]any `json:"payload"`
}

// NotificationsPayload aligné sur SSE / frontend NotificationStreamPayload.
type NotificationsPayload struct {
	Unread       int64 `json:"unread"`
	UnreadShares int64 `json:"unread_shares,omitempty"`
	Items        any   `json:"items,omitempty"`
}
