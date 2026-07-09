package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestSftpGoWebhookAuth_PlainSecret(t *testing.T) {
	t.Setenv("SFTPGO_WEBHOOK_SECRET", "test-secret")
	e := echo.New()
	h := SftpGoWebhookAuth()(func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})

	req := httptest.NewRequest(http.MethodPost, "/hooks", strings.NewReader(`{"action":"upload"}`))
	req.Header.Set("X-SFTPGO-Secret", "test-secret")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	if err := h(c); err != nil {
		t.Fatalf("plain secret: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestSftpGoWebhookAuth_HMACBody(t *testing.T) {
	t.Setenv("SFTPGO_WEBHOOK_SECRET", "hmac-secret")
	body := `{"action":"upload","path":"u/1.pdf"}`
	mac := hmac.New(sha256.New, []byte("hmac-secret"))
	mac.Write([]byte(body))
	sig := hex.EncodeToString(mac.Sum(nil))

	e := echo.New()
	h := SftpGoWebhookAuth()(func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})
	req := httptest.NewRequest(http.MethodPost, "/hooks", strings.NewReader(body))
	req.Header.Set("X-SFTPGO-Secret", sig)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	if err := h(c); err != nil {
		t.Fatalf("hmac: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestSftpGoWebhookAuth_RejectBadSecret(t *testing.T) {
	t.Setenv("SFTPGO_WEBHOOK_SECRET", "real-secret")
	e := echo.New()
	h := SftpGoWebhookAuth()(func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})
	req := httptest.NewRequest(http.MethodPost, "/hooks", strings.NewReader(`{}`))
	req.Header.Set("X-SFTPGO-Secret", "wrong")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	err := h(c)
	if err == nil {
		t.Fatal("expected unauthorized")
	}
	he, ok := err.(*echo.HTTPError)
	if !ok || he.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %v", err)
	}
}

func TestSftpGoWebhookAuth_MissingHeader(t *testing.T) {
	t.Setenv("SFTPGO_WEBHOOK_SECRET", "real-secret")
	e := echo.New()
	h := SftpGoWebhookAuth()(func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})
	req := httptest.NewRequest(http.MethodPost, "/hooks", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	err := h(c)
	if err == nil {
		t.Fatal("expected unauthorized without header")
	}
}
