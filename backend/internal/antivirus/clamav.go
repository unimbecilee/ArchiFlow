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
	return &Client{address: address, timeout: 30 * time.Second}
}

func (c *Client) Scan(ctx context.Context, reader io.Reader) (bool, string, error) {
	conn, err := net.DialTimeout("tcp", c.address, c.timeout)
	if err != nil {
		return false, "", fmt.Errorf("clamd connection failed: %w", err)
	}
	defer conn.Close()

	conn.SetDeadline(time.Now().Add(c.timeout))

	// Send INSTREAM command
	if _, err := conn.Write([]byte("nINSTREAM\n")); err != nil {
		return false, "", fmt.Errorf("send INSTREAM: %w", err)
	}

	// Read response: should be "STREAM\n"
	resp, err := bufio.NewReader(conn).ReadString('\n')
	if err != nil {
		return false, "", fmt.Errorf("read INSTREAM response: %w", err)
	}
	resp = strings.TrimSpace(resp)
	if resp != "STREAM" {
		return false, "", fmt.Errorf("unexpected INSTREAM response: %s", resp)
	}

	// Stream file in chunks of 1024 bytes (clamd protocol)
	buf := make([]byte, 1024)
	for {
		select {
		case <-ctx.Done():
			return false, "", ctx.Err()
		default:
		}

		n, err := reader.Read(buf)
		if n > 0 {
			// Send chunk size (4 bytes big-endian) + data
			chunk := buf[:n]
			size := uint32(len(chunk))
			header := []byte{byte(size >> 24), byte(size >> 16), byte(size >> 8), byte(size)}
			if _, err := conn.Write(header); err != nil {
				return false, "", fmt.Errorf("write chunk header: %w", err)
			}
			if _, err := conn.Write(chunk); err != nil {
				return false, "", fmt.Errorf("write chunk data: %w", err)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return false, "", fmt.Errorf("read file: %w", err)
		}
	}

	// Send zero-length chunk to end stream
	if _, err := conn.Write([]byte{0, 0, 0, 0}); err != nil {
		return false, "", fmt.Errorf("write zero chunk: %w", err)
	}

	// Read final response
	conn.SetReadDeadline(time.Now().Add(10 * time.Second))
	result, err := bufio.NewReader(conn).ReadString('\n')
	if err != nil {
		return false, "", fmt.Errorf("read result: %w", err)
	}

	result = strings.TrimSpace(result)
	clean := strings.HasPrefix(result, "stream: OK")
	return clean, result, nil
}

func (c *Client) Ping() error {
	conn, err := net.DialTimeout("tcp", c.address, 5*time.Second)
	if err != nil {
		return err
	}
	defer conn.Close()
	conn.Write([]byte("nPING\n"))
	bufio.NewReader(conn).ReadString('\n')
	return nil
}