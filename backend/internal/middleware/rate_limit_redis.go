package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

type RedisRateLimiter struct {
	client *redis.Client
}

func NewRedisRateLimiter(redisURL string) (*RedisRateLimiter, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(opt)
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}
	return &RedisRateLimiter{client: client}, nil
}

func (r *RedisRateLimiter) Close() error {
	return r.client.Close()
}

func (r *RedisRateLimiter) Allow(ctx context.Context, key string, rate int, burst int) (bool, int, int, error) {
	now := time.Now().UnixMilli()
	redisKey := fmt.Sprintf("ratelimit:%s", key)

	// GCRA algorithm: track theoretical arrival time (tat)
	// key format: ratelimit:<key> -> hash with fields: tat, last_update
	pipe := r.client.TxPipeline()
	tatCmd := pipe.HGet(ctx, redisKey, "tat")
	lastUpdateCmd := pipe.HGet(ctx, redisKey, "last_update")
	_, err := pipe.Exec(ctx)
	if err != nil && err != redis.Nil {
		return false, 0, 0, err
	}

	tat := float64(now)
	if tatCmd.Val() != "" {
		if v, err := strconv.ParseFloat(tatCmd.Val(), 64); err == nil {
			tat = v
		}
	}
	lastUpdate := float64(now)
	_ = lastUpdate
	if lastUpdateCmd.Val() != "" {
		if v, err := strconv.ParseFloat(lastUpdateCmd.Val(), 64); err == nil {
			lastUpdate = v
		}
	}

	interval := 1000.0 / float64(rate) // ms between requests
	if tat < float64(now) {
		tat = float64(now)
	}

	allow := false
	remaining := burst
	retryAfter := 0

	if tat-float64(now) <= float64(burst)*interval {
		allow = true
		tat += interval
		remaining = int((tat - float64(now)) / interval)
		if remaining < 0 {
			remaining = 0
		}
	} else {
		retryAfter = int((tat - float64(now)) / 1000) + 1
	}

	if allow {
		pipe := r.client.TxPipeline()
		pipe.HSet(ctx, redisKey, "tat", tat, "last_update", now)
		pipe.Expire(ctx, redisKey, time.Duration(burst)*time.Second/time.Duration(rate)*2+time.Minute)
		_, _ = pipe.Exec(ctx)
	}

	return allow, remaining, retryAfter, nil
}

type RedisRateLimitConfig struct {
	KeyPrefix string
	Rate      int // requests per second
	Burst     int
	KeyFunc   func(echo.Context) string
}

func (r *RedisRateLimiter) Middleware(cfg RedisRateLimitConfig) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			key := cfg.KeyPrefix + ":" + cfg.KeyFunc(c)
			allowed, remaining, retryAfter, err := r.Allow(c.Request().Context(), key, cfg.Rate, cfg.Burst)
			if err != nil {
				return err
			}

			c.Response().Header().Set("X-RateLimit-Limit", strconv.Itoa(cfg.Burst))
			c.Response().Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			if retryAfter > 0 {
				c.Response().Header().Set("Retry-After", strconv.Itoa(retryAfter))
			}

			if !allowed {
				return c.JSON(http.StatusTooManyRequests, map[string]any{
					"success": false,
					"error":   "rate limit exceeded",
					"retry_after": retryAfter,
				})
			}

			return next(c)
		}
	}
}

func (r *RedisRateLimiter) GetClient() *redis.Client {
	return r.client
}