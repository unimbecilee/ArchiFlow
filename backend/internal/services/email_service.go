package services

import (
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"os"
	"strings"
)

// EmailService envoi SMTP optionnel (SMTP_* ou alias MAIL_* / Brevo).
type EmailService struct {
	enabled  bool
	host     string
	port     string
	user     string
	password string
	from     string
	useTLS   bool
}

func envFirst(keys ...string) string {
	for _, k := range keys {
		if v := strings.TrimSpace(os.Getenv(k)); v != "" {
			return v
		}
	}
	return ""
}

func envBool(keys ...string) bool {
	for _, k := range keys {
		v := strings.TrimSpace(strings.ToLower(os.Getenv(k)))
		if v == "1" || v == "true" || v == "yes" {
			return true
		}
		if v == "0" || v == "false" || v == "no" {
			return false
		}
	}
	return false
}

func NewEmailService() *EmailService {
	host := envFirst("SMTP_HOST", "MAIL_SERVER")
	from := envFirst("MAIL_DEFAULT_SENDER", "SMTP_FROM")
	if from == "" || strings.HasSuffix(from, "@archiflow.local") {
		if alt := envFirst("SMTP_FROM", "MAIL_DEFAULT_SENDER"); alt != "" && !strings.HasSuffix(alt, "@archiflow.local") {
			from = alt
		} else if from == "" {
			from = "noreply@archiflow.local"
		}
	}
	port := envFirst("SMTP_PORT", "MAIL_PORT")
	if port == "" {
		port = "587"
	}
	useTLS := envBool("SMTP_TLS", "SMTP_USE_TLS", "MAIL_USE_TLS")
	if !useTLS && port == "587" {
		// Brevo / most relays on 587 expect STARTTLS
		useTLS = !envBool("SMTP_USE_SSL", "MAIL_USE_SSL")
	}
	s := &EmailService{
		enabled:  host != "",
		host:     host,
		port:     port,
		user:     envFirst("SMTP_USER", "MAIL_USERNAME"),
		password: envFirst("SMTP_PASSWORD", "MAIL_PASSWORD"),
		from:     from,
		useTLS:   useTLS,
	}
	if s.enabled {
		log.Printf("[email] SMTP enabled host=%s port=%s from=%s tls=%v", s.host, s.port, s.from, s.useTLS)
	} else {
		log.Printf("[email] SMTP disabled (set SMTP_HOST or MAIL_SERVER) — credentials emails logged only")
	}
	return s
}

func (s *EmailService) Enabled() bool {
	return s.enabled
}

func (s *EmailService) Send(to, subject, body string) error {
	if !s.enabled {
		log.Printf("[email stub] to=%s subject=%s\n%s", to, subject, body)
		return fmt.Errorf("smtp not configured")
	}
	msg := strings.Join([]string{
		fmt.Sprintf("From: %s", s.from),
		fmt.Sprintf("To: %s", to),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}, "\r\n")
	addr := net.JoinHostPort(s.host, s.port)
	var auth smtp.Auth
	if s.user != "" {
		auth = smtp.PlainAuth("", s.user, s.password, s.host)
	}
	var err error
	if s.useTLS {
		err = sendMailSTARTTLS(addr, s.host, auth, s.from, []string{to}, []byte(msg))
	} else {
		err = smtp.SendMail(addr, auth, s.from, []string{to}, []byte(msg))
	}
	if err != nil {
		log.Printf("[email] send failed to=%s: %v", to, err)
		return err
	}
	log.Printf("[email] sent to=%s subject=%s", to, subject)
	return nil
}

func sendMailSTARTTLS(addr, host string, auth smtp.Auth, from string, to []string, msg []byte) error {
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err = client.StartTLS(&tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
	}
	if auth != nil {
		if err = client.Auth(auth); err != nil {
			return err
		}
	}
	if err = client.Mail(from); err != nil {
		return err
	}
	for _, rcpt := range to {
		if err = client.Rcpt(rcpt); err != nil {
			return err
		}
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err = w.Write(msg); err != nil {
		return err
	}
	if err = w.Close(); err != nil {
		return err
	}
	return client.Quit()
}

// SendWelcomeCredentials notifies a newly provisioned user (temporary password).
func (s *EmailService) SendWelcomeCredentials(to, firstName, tempPassword, loginURL string) bool {
	name := firstName
	if name == "" {
		name = to
	}
	subject := "ArchiFlow — Vos identifiants de connexion"
	body := fmt.Sprintf(`Bonjour %s,

Un compte ArchiFlow a ete cree pour vous.

URL de connexion : %s
Identifiant : %s
Mot de passe temporaire : %s

A la premiere connexion, vous devrez choisir un nouveau mot de passe.
Ce mot de passe sera utilise sur ArchiFlow et sur Pydio Cells.

Cordialement,
Equipe ArchiFlow
`, name, loginURL, to, tempPassword)
	if err := s.Send(to, subject, body); err != nil {
		return false
	}
	return true
}
