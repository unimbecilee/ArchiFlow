package config

import (
	"context"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	redisOnce   sync.Once
	redisClient *redis.Client
	redisErr    error
)

// RedisClient retourne un client Redis partagé (nil si REDIS_URL absent / KO).
func RedisClient() *redis.Client {
	redisOnce.Do(func() {
		url := strings.TrimSpace(os.Getenv("REDIS_URL"))
		if url == "" {
			return
		}
		opt, err := redis.ParseURL(url)
		if err != nil {
			redisErr = err
			return
		}
		c := redis.NewClient(opt)
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := c.Ping(ctx).Err(); err != nil {
			_ = c.Close()
			redisErr = err
			return
		}
		redisClient = c
	})
	return redisClient
}

// RedisAvailable indique si Redis est utilisable.
func RedisAvailable() bool {
	return RedisClient() != nil
}

func RedisInitError() error { return redisErr }
