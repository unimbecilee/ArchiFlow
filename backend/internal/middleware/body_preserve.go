package middleware

import (
	"bytes"
	"io"

	"github.com/labstack/echo/v4"
)

func readBodyPreserve(c echo.Context) ([]byte, error) {
	if c.Request().Body == nil {
		return nil, nil
	}
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return nil, err
	}
	c.Request().Body = io.NopCloser(bytes.NewBuffer(body))
	return body, nil
}
