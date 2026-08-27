package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const maxJSONBodyBytes = 1 << 20 // 1 MB

var requestValidator = validator.New()

// EchoValidator wires go-playground/validator into Echo's c.Validate().
type EchoValidator struct {
	v *validator.Validate
}

func NewEchoValidator() *EchoValidator {
	return &EchoValidator{v: requestValidator}
}

func (ev *EchoValidator) Validate(i any) error {
	if err := ev.v.Struct(i); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "validation failed")
	}
	return nil
}

// bindJSONStrict decodes JSON body with unknown-field rejection + struct validation.
func bindJSONStrict(c echo.Context, dst any) error {
	req := c.Request()
	if req.Body == nil {
		return echo.NewHTTPError(http.StatusBadRequest, "empty body")
	}
	dec := json.NewDecoder(io.LimitReader(req.Body, maxJSONBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid JSON body")
	}
	// Ensure single JSON object only.
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid JSON body")
	}
	if err := requestValidator.Struct(dst); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "validation failed")
	}
	return nil
}

func bindJSONOptionalStrict(c echo.Context, dst any) error {
	req := c.Request()
	if req.Body == nil {
		return nil
	}
	dec := json.NewDecoder(io.LimitReader(req.Body, maxJSONBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		if errors.Is(err, io.EOF) {
			return nil
		}
		return echo.NewHTTPError(http.StatusBadRequest, "invalid JSON body")
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid JSON body")
	}
	if err := requestValidator.Struct(dst); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "validation failed")
	}
	return nil
}

// parseUintParam validates a required positive uint path parameter.
func parseUintParam(c echo.Context, name string) (uint, error) {
	raw := strings.TrimSpace(c.Param(name))
	if raw == "" {
		return 0, echo.NewHTTPError(http.StatusBadRequest, name+" required")
	}
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || id == 0 {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "invalid "+name)
	}
	return uint(id), nil
}

// requirePathParam validates a non-empty path parameter.
func requirePathParam(c echo.Context, name string) (string, error) {
	v := strings.TrimSpace(c.Param(name))
	if v == "" {
		return "", echo.NewHTTPError(http.StatusBadRequest, name+" required")
	}
	return v, nil
}

// requireQueryParam validates a non-empty query parameter.
func requireQueryParam(c echo.Context, name string) (string, error) {
	v := strings.TrimSpace(c.QueryParam(name))
	if v == "" {
		return "", echo.NewHTTPError(http.StatusBadRequest, name+" required")
	}
	return v, nil
}

// parseUUIDParam validates a required UUID path parameter.
func parseUUIDParam(c echo.Context, name string) (uuid.UUID, error) {
	raw := strings.TrimSpace(c.Param(name))
	if raw == "" {
		return uuid.Nil, echo.NewHTTPError(http.StatusBadRequest, name+" required")
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, echo.NewHTTPError(http.StatusBadRequest, "invalid "+name)
	}
	return id, nil
}

// parsePositiveIntParam validates a required positive int path parameter.
func parsePositiveIntParam(c echo.Context, name string) (int, error) {
	raw := strings.TrimSpace(c.Param(name))
	if raw == "" {
		return 0, echo.NewHTTPError(http.StatusBadRequest, name+" required")
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "invalid "+name)
	}
	return n, nil
}
