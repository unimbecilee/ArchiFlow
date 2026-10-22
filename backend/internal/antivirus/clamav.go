package antivirus

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net"
	"strings"
	"time"
)

type Client struct {
	address string
	timeout time.Duration
}

func NewClient(address string) *Client {
	return &Client{address: address, timeout: 120 * time.Second}
}

// Scan envoie le flux via la commande clamd INSTREAM.
// Protocole : nINSTREAM\n puis chunks (4 octets BE + data), chunk 0, puis
// une seule réponse "stream: OK" / "stream: … FOUND". Pas de réponse intermédiaire.
func (c *Client) Scan(ctx context.Context, reader io.Reader) (bool, string, error) {
	d := net.Dialer{Timeout: 10 * time.Second}
	conn, err := d.DialContext(ctx, "tcp", c.address)
	if err != nil {
		return false, "", fmt.Errorf("clamd connection failed: %w", err)
	}
	defer conn.Close()

	deadline := time.Now().Add(c.timeout)
	if dl, ok := ctx.Deadline(); ok && dl.Before(deadline) {
		deadline = dl
	}
	_ = conn.SetDeadline(deadline)

	if _, err := conn.Write([]byte("nINSTREAM\n")); err != nil {
		return false, "", fmt.Errorf("send INSTREAM: %w", err)
	}

	buf := make([]byte, 32*1024)
	for {
		select {
		case <-ctx.Done():
			return false, "", ctx.Err()
		default:
		}

		n, err := reader.Read(buf)
		if n > 0 {
			chunk := buf[:n]
			size := uint32(len(chunk))
			header := []byte{byte(size >> 24), byte(size >> 16), byte(size >> 8), byte(size)}
			if _, werr := conn.Write(header); werr != nil {
				return false, "", fmt.Errorf("write chunk header: %w", werr)
			}
			if _, werr := conn.Write(chunk); werr != nil {
				return false, "", fmt.Errorf("write chunk data: %w", werr)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return false, "", fmt.Errorf("read file: %w", err)
		}
	}

	if _, err := conn.Write([]byte{0, 0, 0, 0}); err != nil {
		return false, "", fmt.Errorf("write zero chunk: %w", err)
	}

	result, err := bufio.NewReader(conn).ReadString('\n')
	if err != nil {
		return false, "", fmt.Errorf("read result: %w", err)
	}

	result = strings.TrimSpace(result)
	clean := strings.HasPrefix(result, "stream: OK") || strings.EqualFold(result, "OK")
	return clean, result, nil
}

func (c *Client) Ping() error {
	conn, err := net.DialTimeout("tcp", c.address, 5*time.Second)
	if err != nil {
		return err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(5 * time.Second))
	if _, err := conn.Write([]byte("nPING\n")); err != nil {
		return err
	}
	resp, err := bufio.NewReader(conn).ReadString('\n')
	if err != nil {
		return err
	}
	if !strings.EqualFold(strings.TrimSpace(resp), "PONG") {
		return fmt.Errorf("unexpected ping response: %q", strings.TrimSpace(resp))
	}
	return nil
}
