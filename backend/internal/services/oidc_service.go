package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"os"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

type OIDCService struct {
	provider     *oidc.Provider
	verifier     *oidc.IDTokenVerifier
	oauth2Config oauth2.Config
	enabled      bool
}

func NewOIDCService(ctx context.Context) (*OIDCService, error) {
	issuer := os.Getenv("OIDC_ISSUER_URL")
	clientID := os.Getenv("OIDC_CLIENT_ID")
	clientSecret := os.Getenv("OIDC_CLIENT_SECRET")
	redirectURL := os.Getenv("OIDC_REDIRECT_URL")
	if issuer == "" || clientID == "" {
		return &OIDCService{enabled: false}, nil
	}
	provider, err := oidc.NewProvider(ctx, issuer)
	if err != nil {
		return nil, err
	}
	verifier := provider.Verifier(&oidc.Config{ClientID: clientID})
	oauth2Config := oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  redirectURL,
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
	}
	return &OIDCService{provider: provider, verifier: verifier, oauth2Config: oauth2Config, enabled: true}, nil
}

func (s *OIDCService) Enabled() bool { return s.enabled }

func (s *OIDCService) AuthCodeURL(state string) string {
	return s.oauth2Config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (s *OIDCService) Exchange(ctx context.Context, code string) (*oauth2.Token, error) {
	return s.oauth2Config.Exchange(ctx, code)
}

func (s *OIDCService) VerifyIDToken(ctx context.Context, rawIDToken string) (*oidc.IDToken, error) {
	return s.verifier.Verify(ctx, rawIDToken)
}

func GenerateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

type SCIMService struct {
	userRepo repository.UserRepository
}

func NewSCIMService(userRepo repository.UserRepository) *SCIMService {
	return &SCIMService{userRepo: userRepo}
}

func (s *SCIMService) ListUsers(ctx context.Context) ([]models.User, error) {
	return s.userRepo.ListAll(1000, 0)
}

func (s *SCIMService) GetUser(ctx context.Context, id uint) (*models.User, error) {
	return s.userRepo.GetByID(id)
}

func (s *SCIMService) CreateUser(ctx context.Context, email, givenName, familyName, role string) (*models.User, error) {
	if role == "" {
		role = "user"
	}
	if _, err := s.userRepo.GetByEmail(email); err == nil {
		return nil, errors.New("user already exists")
	}
	user := &models.User{Email: email, FirstName: givenName, LastName: familyName, Role: role, IsActive: true}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *SCIMService) UpdateUser(ctx context.Context, id uint, email, givenName, familyName *string, active *bool) (*models.User, error) {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if email != nil {
		user.Email = *email
	}
	if givenName != nil {
		user.FirstName = *givenName
	}
	if familyName != nil {
		user.LastName = *familyName
	}
	if active != nil {
		user.IsActive = *active
	}
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *SCIMService) DeleteUser(ctx context.Context, id uint) error {
	return s.userRepo.Delete(id)
}
