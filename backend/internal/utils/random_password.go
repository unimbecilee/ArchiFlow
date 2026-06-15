package utils

import (
	"crypto/rand"
	"math/big"
)

const pwdChars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#"

// GenerateRandomPassword returns a cryptographically random password (default 14 chars).
func GenerateRandomPassword(length int) (string, error) {
	if length < 12 {
		length = 12
	}
	out := make([]byte, length)
	max := big.NewInt(int64(len(pwdChars)))
	for i := range out {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		out[i] = pwdChars[n.Int64()]
	}
	return string(out), nil
}
