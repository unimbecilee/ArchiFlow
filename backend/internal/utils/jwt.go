package utils

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID       uint   `json:"user_id"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	TokenVersion uint   `json:"tv"`
	SessionID    string `json:"sid"`
	jwt.RegisteredClaims
}

type JWTUtil struct {
	secret        []byte
	refreshSecret []byte
	accessExpiry  time.Duration
	refreshExpiry time.Duration
}

func NewJWTUtil(secret, refreshSecret string) *JWTUtil {
	access := 15 * time.Minute
	if v := strings.TrimSpace(os.Getenv("JWT_ACCESS_EXPIRY_MINUTES")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			access = time.Duration(n) * time.Minute
		}
	}
	refreshDays := 7
	if v := strings.TrimSpace(os.Getenv("JWT_REFRESH_EXPIRY_DAYS")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			refreshDays = n
		}
	}
	return &JWTUtil{
		secret:        []byte(secret),
		refreshSecret: []byte(refreshSecret),
		accessExpiry:  access,
		refreshExpiry: time.Duration(refreshDays) * 24 * time.Hour,
	}
}

func (j *JWTUtil) AccessExpiry() time.Duration {
	return j.accessExpiry
}

func (j *JWTUtil) RefreshExpiry() time.Duration {
	return j.refreshExpiry
}

// GenerateAccessToken — access court ; refresh = session opaque en base.
func (j *JWTUtil) GenerateAccessToken(
	userID uint,
	email, role string,
	tokenVersion uint,
	sessionID string,
) (string, error) {
	claims := JWTClaims{
		UserID:       userID,
		Email:        email,
		Role:         role,
		TokenVersion: tokenVersion,
		SessionID:    sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.accessExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secret)
}

func (j *JWTUtil) ValidateAccessToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return j.secret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}

const wsTicketExpiry = 60 * time.Second

// GenerateWSTicket short-lived token for WebSocket upgrade (avoids JWT in query logs).
func (j *JWTUtil) GenerateWSTicket(
	userID uint,
	email, role string,
	tokenVersion uint,
	sessionID string,
) (string, error) {
	claims := JWTClaims{
		UserID:       userID,
		Email:        email,
		Role:         role,
		TokenVersion: tokenVersion,
		SessionID:    sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "ws_ticket",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(wsTicketExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secret)
}

// ValidateWSTicket validates a WebSocket ticket (not a general access token).
func (j *JWTUtil) ValidateWSTicket(tokenString string) (*JWTClaims, error) {
	claims, err := j.ValidateAccessToken(tokenString)
	if err != nil {
		return nil, err
	}
	if claims.Subject != "ws_ticket" {
		return nil, fmt.Errorf("not a ws ticket")
	}
	return claims, nil
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
}
