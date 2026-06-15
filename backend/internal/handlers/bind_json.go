package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"
)

const maxJSONBodyBytes = 1 << 20 // 1 MB

// bindJSONStrict decodes JSON body with unknown-field rejection.
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
	return nil
}
