package handlers

import (
	"net/http"
	"os"
	"strconv"
	"strings"

	"archiflow/backend/internal/config"

	"github.com/labstack/echo/v4"
)

const refreshCookieName = "archiflow_refresh"

func refreshCookiePath() string {
	return "/api/auth"
}

func refreshCookieMaxAge() int {
	days := 7
	if v := strings.TrimSpace(os.Getenv("JWT_REFRESH_EXPIRY_DAYS")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			days = n
		}
	}
	return days * 24 * 3600
}

func cookieSecure() bool {
	if v := strings.TrimSpace(os.Getenv("COOKIE_SECURE")); v != "" {
		return v == "1" || strings.EqualFold(v, "true")
	}
	return config.IsProduction()
}

func cookieSameSite() http.SameSite {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("COOKIE_SAME_SITE"))) {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func setRefreshTokenCookie(c echo.Context, refreshToken string) {
	c.SetCookie(&http.Cookie{
		Name:     refreshCookieName,
		Value:    refreshToken,
		Path:     refreshCookiePath(),
		MaxAge:   refreshCookieMaxAge(),
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: cookieSameSite(),
	})
}

func clearRefreshTokenCookie(c echo.Context) {
	c.SetCookie(&http.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     refreshCookiePath(),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: cookieSameSite(),
	})
}

func readRefreshTokenCookie(c echo.Context) string {
	cookie, err := c.Cookie(refreshCookieName)
	if err != nil || cookie == nil {
		return ""
	}
	return strings.TrimSpace(cookie.Value)
}
