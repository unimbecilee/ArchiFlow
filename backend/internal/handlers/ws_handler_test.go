package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"archiflow/backend/internal/utils"

	"github.com/labstack/echo/v4"
)

type stubSession struct{}

func (stubSession) ValidateTokenVersion(userID, claimVersion uint) error { return nil }

func TestWSIssueTicketRequiresAuth(t *testing.T) {
	e := echo.New()
	jwt := utils.NewJWTUtil("test-secret-key-at-least-32-chars!!", "refresh-secret-key-32-chars-min!!")
	h := NewWSHandler(nil, jwt, stubSession{})

	e.POST("/ws/ticket", func(c echo.Context) error {
		return h.IssueTicket(c)
	})

	req := httptest.NewRequest(http.MethodPost, "/ws/ticket", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestWSIssueTicketOK(t *testing.T) {
	e := echo.New()
	jwt := utils.NewJWTUtil("test-secret-key-at-least-32-chars!!", "refresh-secret-key-32-chars-min!!")
	h := NewWSHandler(nil, jwt, stubSession{})

	e.POST("/ws/ticket", func(c echo.Context) error {
		c.Set("userID", uint(5))
		c.Set("email", "admin@test.local")
		c.Set("role", "admin")
		c.Set("sessionID", "s1")
		c.Set("tokenVersion", uint(2))
		return h.IssueTicket(c)
	})

	req := httptest.NewRequest(http.MethodPost, "/ws/ticket", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	data, _ := body["data"].(map[string]any)
	ticket, _ := data["ticket"].(string)
	if ticket == "" {
		t.Fatal("missing ticket")
	}
	if _, err := jwt.ValidateWSTicket(ticket); err != nil {
		t.Fatal(err)
	}
}

func TestWSConnectRejectsAccessToken(t *testing.T) {
	e := echo.New()
	jwt := utils.NewJWTUtil("test-secret-key-at-least-32-chars!!", "refresh-secret-key-32-chars-min!!")
	h := NewWSHandler(nil, jwt, stubSession{})
	access, err := jwt.GenerateAccessToken(1, "a@b.c", "user", 0, "")
	if err != nil {
		t.Fatal(err)
	}

	e.GET("/ws", h.Connect)
	req := httptest.NewRequest(http.MethodGet, "/ws?ticket="+access, nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for access token as ticket, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "invalid") && rec.Code == 200 {
		t.Fatal("expected invalid ticket")
	}
}
