package jobqueue

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
)

// RedisOptFromURL builds asynq options from a redis:// URL or host:port string.
func RedisOptFromURL(redisURL string) (asynq.RedisClientOpt, error) {
	redisURL = strings.TrimSpace(redisURL)
	if redisURL == "" {
		return asynq.RedisClientOpt{}, fmt.Errorf("REDIS_URL is empty")
	}
	if strings.Contains(redisURL, "://") {
		opt, err := redis.ParseURL(redisURL)
		if err != nil {
			return asynq.RedisClientOpt{}, fmt.Errorf("parse REDIS_URL: %w", err)
		}
		return asynq.RedisClientOpt{
			Addr:     opt.Addr,
			Username: opt.Username,
			Password: opt.Password,
			DB:       opt.DB,
		}, nil
	}
	// host:port[/db]
	addr := redisURL
	db := 0
	if i := strings.LastIndex(redisURL, "/"); i >= 0 {
		addr = redisURL[:i]
		if n, err := strconv.Atoi(redisURL[i+1:]); err == nil {
			db = n
		}
	}
	if _, err := url.Parse("redis://" + addr); err != nil {
		return asynq.RedisClientOpt{}, fmt.Errorf("invalid redis addr %q: %w", redisURL, err)
	}
	return asynq.RedisClientOpt{Addr: addr, DB: db}, nil
}
