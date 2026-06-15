package services

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/utils"
)

// SessionMeta — contexte client pour audit session.
type SessionMeta struct {
	UserAgent string
	IPAddress string
}

type SessionService struct {
	users    repository.UserRepository
	sessions repository.RefreshTokenRepository
	jwt      *utils.JWTUtil
}

func NewSessionService(
	users repository.UserRepository,
	sessions repository.RefreshTokenRepository,
	jwt *utils.JWTUtil,
) *SessionService {
	return &SessionService{users: users, sessions: sessions, jwt: jwt}
}

func sessionIdleTimeout() time.Duration {
	minutes := 30
	if v := strings.TrimSpace(os.Getenv("JWT_SESSION_IDLE_MINUTES")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			minutes = n
		}
	}
	return time.Duration(minutes) * time.Minute
}

func maxSessionsPerUser() int {
	v := strings.TrimSpace(os.Getenv("JWT_MAX_SESSIONS_PER_USER"))
	if v == "" {
		return 10
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 0 {
		return 10
	}
	return n
}

func (s *SessionService) refreshExpiry() time.Duration {
	return s.jwt.RefreshExpiry()
}

// IssueTokens — nouvelle session (login / register).
func (s *SessionService) IssueTokens(user *models.User, meta SessionMeta) (*utils.TokenPair, error) {
	max := maxSessionsPerUser()
	if max > 0 {
		_ = s.sessions.RevokeOldestActiveForUser(user.ID, max-1)
	}
	return s.createSession(user, meta)
}

func (s *SessionService) createSession(user *models.User, meta SessionMeta) (*utils.TokenPair, error) {
	raw, err := utils.NewOpaqueRefreshToken()
	if err != nil {
		return nil, errors.New("failed to generate session")
	}
	now := time.Now()
	sessionID := utils.NewSessionID()
	familyID := utils.NewSessionID()
	exp := now.Add(s.refreshExpiry())

	row := &models.UserRefreshToken{
		ID:         sessionID,
		UserID:     user.ID,
		FamilyID:   familyID,
		TokenHash:  utils.HashRefreshToken(raw),
		UserAgent:  truncate(meta.UserAgent, 512),
		IPAddress:  truncate(meta.IPAddress, 45),
		ExpiresAt:  exp,
		LastUsedAt: now,
		CreatedAt:  now,
	}
	if err := s.sessions.Create(row); err != nil {
		return nil, errors.New("failed to persist session")
	}

	access, err := s.jwt.GenerateAccessToken(user.ID, user.Email, user.Role, user.TokenVersion, sessionID)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	return &utils.TokenPair{
		AccessToken:  access,
		RefreshToken: raw,
		ExpiresIn:    int64(s.jwt.AccessExpiry().Seconds()),
	}, nil
}

// RotateRefresh — rotation + détection réutilisation token révoqué.
func (s *SessionService) RotateRefresh(rawRefresh string, meta SessionMeta) (*utils.TokenPair, error) {
	if strings.TrimSpace(rawRefresh) == "" {
		return nil, errors.New("invalid refresh token")
	}
	hash := utils.HashRefreshToken(rawRefresh)

	row, err := s.sessions.GetActiveByHash(hash)
	if err != nil {
		// Token révoqué réutilisé → invalider toute la famille (vol possible).
		if prev, findErr := s.sessions.GetByHash(hash); findErr == nil && prev.RevokedAt != nil {
			_ = s.sessions.RevokeFamily(prev.FamilyID)
		}
		return nil, errors.New("invalid refresh token")
	}

	user, err := s.users.GetByID(row.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	if !user.IsActive {
		_ = s.sessions.RevokeFamily(row.FamilyID)
		return nil, errors.New("account is deactivated")
	}

	idle := sessionIdleTimeout()
	if time.Since(row.LastUsedAt) > idle {
		_ = s.sessions.RevokeFamily(row.FamilyID)
		return nil, errors.New("session expired due to inactivity")
	}

	if err := s.sessions.RevokeByID(row.ID); err != nil {
		return nil, errors.New("failed to rotate session")
	}

	newRaw, err := utils.NewOpaqueRefreshToken()
	if err != nil {
		return nil, errors.New("failed to generate session")
	}
	now := time.Now()
	newID := utils.NewSessionID()
	newRow := &models.UserRefreshToken{
		ID:         newID,
		UserID:     user.ID,
		FamilyID:   row.FamilyID,
		TokenHash:  utils.HashRefreshToken(newRaw),
		UserAgent:  truncate(meta.UserAgent, 512),
		IPAddress:  truncate(meta.IPAddress, 45),
		ExpiresAt:  row.ExpiresAt,
		LastUsedAt: now,
		CreatedAt:  now,
	}
	if err := s.sessions.Create(newRow); err != nil {
		return nil, errors.New("failed to persist session")
	}

	access, err := s.jwt.GenerateAccessToken(user.ID, user.Email, user.Role, user.TokenVersion, newID)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	return &utils.TokenPair{
		AccessToken:  access,
		RefreshToken: newRaw,
		ExpiresIn:    int64(s.jwt.AccessExpiry().Seconds()),
	}, nil
}

// RevokeRefresh — logout session courante (cookie).
func (s *SessionService) RevokeRefresh(rawRefresh string) error {
	if strings.TrimSpace(rawRefresh) == "" {
		return nil
	}
	hash := utils.HashRefreshToken(rawRefresh)
	row, err := s.sessions.GetActiveByHash(hash)
	if err != nil {
		return nil
	}
	return s.sessions.RevokeByID(row.ID)
}

// RevokeAllUserSessions — révoque sans bump (ex. suppression compte).
func (s *SessionService) RevokeAllUserSessions(userID uint) error {
	return s.sessions.RevokeAllForUser(userID)
}

// InvalidateUser — bump token_version + révoque toutes les sessions (MDP, admin).
func (s *SessionService) InvalidateUser(userID uint) error {
	if err := s.sessions.RevokeAllForUser(userID); err != nil {
		return err
	}
	return s.users.IncrementTokenVersion(userID)
}

func (s *SessionService) ValidateTokenVersion(userID uint, claimVersion uint) error {
	v, err := s.users.GetTokenVersion(userID)
	if err != nil {
		return errors.New("invalid session")
	}
	if v != claimVersion {
		return errors.New("session invalidated")
	}
	return nil
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}
