package middleware

import (
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/sony/gobreaker"
)

type CircuitBreakerConfig struct {
	Name         string
	Timeout      time.Duration
	MaxRequests  uint32
	Interval     time.Duration
	ReadyToTrip  func(counts gobreaker.Counts) bool
	OnStateChange func(name string, from gobreaker.State, to gobreaker.State)
}

func CircuitBreaker(cfg CircuitBreakerConfig) echo.MiddlewareFunc {
	cbSettings := gobreaker.Settings{
		Name:        cfg.Name,
		Timeout:     cfg.Timeout,
		MaxRequests: cfg.MaxRequests,
		Interval:    cfg.Interval,
		ReadyToTrip: cfg.ReadyToTrip,
		OnStateChange: cfg.OnStateChange,
	}

	if cbSettings.Timeout == 0 {
		cbSettings.Timeout = 30 * time.Second
	}
	if cbSettings.MaxRequests == 0 {
		cbSettings.MaxRequests = 3
	}
	if cbSettings.Interval == 0 {
		cbSettings.Interval = 10 * time.Second
	}
	if cbSettings.ReadyToTrip == nil {
		cbSettings.ReadyToTrip = func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 10 && failureRatio >= 0.5
		}
	}

	cb := gobreaker.NewCircuitBreaker(cbSettings)

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			_, err := cb.Execute(func() (interface{}, error) {
				return nil, next(c)
			})
			if err != nil {
				if err == gobreaker.ErrOpenState {
					return c.JSON(http.StatusServiceUnavailable, map[string]any{
						"success": false,
						"error":   "service temporarily unavailable (circuit breaker open)",
					})
				}
				return err
			}
			return nil
		}
	}
}

func OnlyOfficeCircuitBreaker() echo.MiddlewareFunc {
	return CircuitBreaker(CircuitBreakerConfig{
		Name:        "onlyoffice",
		Timeout:     30 * time.Second,
		MaxRequests: 3,
		Interval:    10 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			return counts.TotalFailures >= 5
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			log.Printf("Circuit breaker '%s' changed from %s to %s", name, from, to)
		},
	})
}

func CollaboraCircuitBreaker() echo.MiddlewareFunc {
	return CircuitBreaker(CircuitBreakerConfig{
		Name:        "collabora",
		Timeout:     30 * time.Second,
		MaxRequests: 3,
		Interval:    10 * time.Second,
	})
}

func SMTPICircuitBreaker() echo.MiddlewareFunc {
	return CircuitBreaker(CircuitBreakerConfig{
		Name:        "smtp",
		Timeout:     60 * time.Second,
		MaxRequests: 1,
		Interval:    30 * time.Second,
	})
}

func PydioCircuitBreaker() echo.MiddlewareFunc {
	return CircuitBreaker(CircuitBreakerConfig{
		Name:        "pydio",
		Timeout:     30 * time.Second,
		MaxRequests: 3,
		Interval:    10 * time.Second,
	})
}