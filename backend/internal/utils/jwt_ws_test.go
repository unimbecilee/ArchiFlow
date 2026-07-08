package utils

import (
	"testing"
	"time"
)

func TestWSTicketRoundTrip(t *testing.T) {
	j := NewJWTUtil("test-secret-key-at-least-32-chars!!", "refresh-secret-key-32-chars-min!!")
	ticket, err := j.GenerateWSTicket(7, "u@test.local", "admin", 1, "sess-1")
	if err != nil {
		t.Fatal(err)
	}
	claims, err := j.ValidateWSTicket(ticket)
	if err != nil {
		t.Fatal(err)
	}
	if claims.UserID != 7 || claims.Email != "u@test.local" || claims.Subject != "ws_ticket" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
	access, _ := j.GenerateAccessToken(7, "u@test.local", "admin", 1, "sess-1")
	if _, err := j.ValidateWSTicket(access); err == nil {
		t.Fatal("access token must not validate as ws ticket")
	}
}

func TestWSTicketExpires(t *testing.T) {
	j := NewJWTUtil("test-secret-key-at-least-32-chars!!", "refresh-secret-key-32-chars-min!!")
	ticket, err := j.GenerateWSTicket(1, "a@b.c", "user", 0, "")
	if err != nil {
		t.Fatal(err)
	}
	claims, err := j.ValidateWSTicket(ticket)
	if err != nil {
		t.Fatal(err)
	}
	if claims.ExpiresAt == nil || time.Until(claims.ExpiresAt.Time) > 2*time.Minute {
		t.Fatal("expected short ws ticket expiry")
	}
}
