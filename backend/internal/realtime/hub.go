package realtime

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const maxClientsPerUser = 5

type client struct {
	userID uint
	conn   *websocket.Conn
	send   chan []byte
}

// Hub connexions WebSocket par utilisateur (mémoire, instance unique).
type Hub struct {
	mu      sync.RWMutex
	clients map[uint][]*client
}

func NewHub() *Hub {
	return &Hub{clients: make(map[uint][]*client)}
}

func (h *Hub) Register(userID uint, conn *websocket.Conn) *client {
	c := &client{
		userID: userID,
		conn:   conn,
		send:   make(chan []byte, 32),
	}
	h.mu.Lock()
	list := append(h.clients[userID], c)
	if len(list) > maxClientsPerUser {
		// Ferme les plus anciennes connexions.
		for _, old := range list[:len(list)-maxClientsPerUser] {
			h.removeClientLocked(userID, old)
		}
		list = list[len(list)-maxClientsPerUser:]
	}
	h.clients[userID] = list
	h.mu.Unlock()

	go c.writePump()
	return c
}

func (h *Hub) Unregister(c *client) {
	if c == nil {
		return
	}
	h.mu.Lock()
	h.removeClientLocked(c.userID, c)
	h.mu.Unlock()
	close(c.send)
}

func (h *Hub) removeClientLocked(userID uint, target *client) {
	list := h.clients[userID]
	out := list[:0]
	for _, c := range list {
		if c != target {
			out = append(out, c)
		}
	}
	if len(out) == 0 {
		delete(h.clients, userID)
	} else {
		h.clients[userID] = out
	}
	_ = target.conn.Close()
}

func (c *client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// PublishToUser envoie un événement à toutes les sessions de l'utilisateur.
func (h *Hub) PublishToUser(userID uint, env Envelope) {
	if userID == 0 {
		return
	}
	b, err := json.Marshal(env)
	if err != nil {
		return
	}

	h.mu.RLock()
	list := append([]*client(nil), h.clients[userID]...)
	h.mu.RUnlock()

	for _, c := range list {
		select {
		case c.send <- b:
		default:
			// Buffer plein — connexion lente, on ignore pour ne pas bloquer.
		}
	}
}
