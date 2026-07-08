package handlers

import (
	"net/http"
	"os"
	"strings"
	"time"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/realtime"
	"archiflow/backend/internal/utils"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

type WSHandler struct {
	hub      *realtime.Hub
	jwt      *utils.JWTUtil
	sessions sessionValidator
}

type sessionValidator interface {
	ValidateTokenVersion(userID, claimVersion uint) error
}

func NewWSHandler(hub *realtime.Hub, jwt *utils.JWTUtil, sessions sessionValidator) *WSHandler {
	return &WSHandler{hub: hub, jwt: jwt, sessions: sessions}
}

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     wsCheckOrigin,
}

func wsCheckOrigin(r *http.Request) bool {
	origin := strings.TrimRight(r.Header.Get("Origin"), "/")
	if origin == "" {
		return !config.IsProduction()
	}
	allowed := map[string]struct{}{
		"http://localhost:3000":  {},
		"http://127.0.0.1:3000":  {},
		"http://localhost:5173":  {},
		"http://127.0.0.1:5173":  {},
	}
	if u := strings.TrimSpace(os.Getenv("FRONTEND_URL")); u != "" {
		allowed[strings.TrimRight(u, "/")] = struct{}{}
	}
	if _, ok := allowed[origin]; ok {
		return true
	}
	if !config.IsProduction() &&
		(strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:")) {
		return true
	}
	return false
}

// IssueTicket POST /api/ws/ticket — short-lived ticket for WebSocket (no JWT in URL).
func (h *WSHandler) IssueTicket(c echo.Context) error {
	userID, ok := c.Get("userID").(uint)
	if !ok || userID == 0 {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}
	email, _ := c.Get("email").(string)
	role, _ := c.Get("role").(string)
	sessionID, _ := c.Get("sessionID").(string)
	tv, _ := c.Get("tokenVersion").(uint)
	ticket, err := h.jwt.GenerateWSTicket(userID, email, role, tv, sessionID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "ticket failed")
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "data": map[string]string{"ticket": ticket}})
}

// Connect GET /api/ws — WebSocket notifications (ticket query or Authorization).
func (h *WSHandler) Connect(c echo.Context) error {
	token := strings.TrimSpace(c.QueryParam("ticket"))
	if token == "" {
		auth := c.Request().Header.Get("Authorization")
		if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
			token = strings.TrimSpace(auth[7:])
		}
	}
	if token == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "ticket required")
	}

	claims, err := h.jwt.ValidateWSTicket(token)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid token")
	}
	if err := h.sessions.ValidateTokenVersion(claims.UserID, claims.TokenVersion); err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "session invalidated")
	}

	conn, err := wsUpgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	client := h.hub.Register(claims.UserID, conn)
	defer h.hub.Unregister(client)

	_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return nil
		}
		if string(msg) == "ping" {
			_ = conn.WriteMessage(websocket.TextMessage, []byte(`{"v":1,"type":"ping","ts":0,"payload":{"ok":true}}`))
		}
	}
}
