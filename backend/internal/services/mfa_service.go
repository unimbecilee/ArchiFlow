package services

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

type MFAService struct{}

func NewMFAService() *MFAService {
	return &MFAService{}
}

func (s *MFAService) GenerateSecret(issuer, accountName string) (string, string, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      issuer,
		AccountName: accountName,
		SecretSize:  32,
		Algorithm:   otp.AlgorithmSHA256,
		Digits:      6,
		Period:      30,
	})
	if err != nil {
		return "", "", err
	}
	return key.Secret(), key.URL(), nil
}

func (s *MFAService) ValidateCode(secret, code string) bool {
	return totp.Validate(code, secret)
}

func (s *MFAService) GenerateRecoveryCodes(count int) ([]string, error) {
	codes := make([]string, count)
	for i := 0; i < count; i++ {
		b := make([]byte, 8)
		if _, err := rand.Read(b); err != nil {
			return nil, err
		}
		codes[i] = base64.RawURLEncoding.EncodeToString(b)[:10]
	}
	return codes, nil
}

func (s *MFAService) EncodeRecoveryCodes(codes []string) (string, error) {
	data, err := json.Marshal(codes)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (s *MFAService) DecodeRecoveryCodes(encoded string) ([]string, error) {
	var codes []string
	if encoded == "" {
		return codes, nil
	}
	err := json.Unmarshal([]byte(encoded), &codes)
	return codes, err
}

func (s *MFAService) ConsumeRecoveryCode(encoded string, code string) (string, bool, error) {
	codes, err := s.DecodeRecoveryCodes(encoded)
	if err != nil {
		return "", false, err
	}
	for i, c := range codes {
		if c == code {
			codes = append(codes[:i], codes[i+1:]...)
			newEncoded, err := s.EncodeRecoveryCodes(codes)
			return newEncoded, true, err
		}
	}
	return encoded, false, nil
}

func (s *MFAService) QRCodeURL(secret string) string {
	return fmt.Sprintf("otpauth://totp/ArchiFlow?secret=%s&issuer=ArchiFlow&algorithm=SHA256&digits=6&period=30", secret)
}

func (s *MFAService) ProvisioningURI(secret, issuer, accountName string) string {
	return fmt.Sprintf("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA256&digits=6&period=30",
		issuer, accountName, secret, issuer)
}