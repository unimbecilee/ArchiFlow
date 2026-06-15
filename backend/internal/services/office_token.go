package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

const officeTokenTTL = 2 * time.Hour

// officeToken: base64url(docID|userID|expUnix|purpose|hmac)
func signOfficeToken(secret string, docID, userID uint, purpose string, ttl time.Duration) (string, error) {
	if secret == "" {
		return "", errors.New("office token secret not configured")
	}
	exp := time.Now().Add(ttl).Unix()
	payload := fmt.Sprintf("%d|%d|%d|%s", docID, userID, exp, purpose)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	raw := payload + "|" + sig
	return base64.RawURLEncoding.EncodeToString([]byte(raw)), nil
}

func verifyOfficeToken(secret, token string, purpose string) (docID, userID uint, err error) {
	if secret == "" {
		return 0, 0, errors.New("office token secret not configured")
	}
	dec, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return 0, 0, errors.New("invalid token")
	}
	parts := strings.Split(string(dec), "|")
	if len(parts) != 5 {
		return 0, 0, errors.New("invalid token format")
	}
	if parts[3] != purpose {
		return 0, 0, errors.New("invalid token purpose")
	}
	did, err := strconv.ParseUint(parts[0], 10, 64)
	if err != nil {
		return 0, 0, errors.New("invalid doc id")
	}
	uid, err := strconv.ParseUint(parts[1], 10, 64)
	if err != nil {
		return 0, 0, errors.New("invalid user id")
	}
	exp, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		return 0, 0, errors.New("invalid expiry")
	}
	if time.Now().Unix() > exp {
		return 0, 0, errors.New("token expired")
	}
	payload := strings.Join(parts[:4], "|")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	expected, err := base64.RawURLEncoding.DecodeString(parts[4])
	if err != nil {
		return 0, 0, errors.New("invalid signature")
	}
	if !hmac.Equal(mac.Sum(nil), expected) {
		return 0, 0, errors.New("invalid signature")
	}
	return uint(did), uint(uid), nil
}

// documentKey stable key for OnlyOffice co-editing cache (change when file bytes change).
func documentOfficeKey(docID uint, version int, updatedUnix int64) string {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(updatedUnix))
	return fmt.Sprintf("%d_%d_%x", docID, version, buf)
}
