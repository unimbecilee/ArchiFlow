package jobqueue

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/hibiken/asynq"
)

var (
	globalClient *Client
	clientMu     sync.RWMutex
)

func SetGlobalClient(c *Client) {
	clientMu.Lock()
	defer clientMu.Unlock()
	globalClient = c
}

func GetGlobalClient() *Client {
	clientMu.RLock()
	defer clientMu.RUnlock()
	return globalClient
}

func Enqueue(ctx context.Context, task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
	client := GetGlobalClient()
	if client == nil {
		return nil, ErrNoClient
	}
	return client.Enqueue(ctx, task, opts...)
}

func EnqueueIn(ctx context.Context, delay time.Duration, task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
	client := GetGlobalClient()
	if client == nil {
		return nil, ErrNoClient
	}
	return client.EnqueueIn(ctx, delay, task, opts...)
}

var ErrNoClient = errors.New("job queue client not initialized")