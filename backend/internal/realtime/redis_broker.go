package realtime

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const redisRealtimeChannel = "archiflow:realtime:v1"

type redisWireMessage struct {
	UserID uint     `json:"user_id"`
	Env    Envelope `json:"env"`
}

// RedisBroker distribue les événements entre replicas (pub/sub) ; livraison locale via Hub.
type RedisBroker struct {
	hub    *Hub
	client *redis.Client
	pubsub *redis.PubSub
	done   chan struct{}
	wg     sync.WaitGroup
}

func NewRedisBroker(hub *Hub, redisURL string) (*RedisBroker, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, err
	}

	b := &RedisBroker{
		hub:    hub,
		client: client,
		done:   make(chan struct{}),
	}
	b.pubsub = client.Subscribe(context.Background(), redisRealtimeChannel)

	b.wg.Add(1)
	go b.listen()

	return b, nil
}

func (b *RedisBroker) listen() {
	defer b.wg.Done()
	ch := b.pubsub.Channel()
	for {
		select {
		case <-b.done:
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			var wire redisWireMessage
			if err := json.Unmarshal([]byte(msg.Payload), &wire); err != nil {
				continue
			}
			if wire.UserID == 0 {
				continue
			}
			env := wire.Env
			if env.V == 0 {
				env.V = 1
			}
			if env.TS == 0 {
				env.TS = time.Now().Unix()
			}
			b.hub.PublishToUser(wire.UserID, env)
		}
	}
}

func (b *RedisBroker) PublishToUser(userID uint, env Envelope) {
	if b == nil || b.client == nil || userID == 0 {
		return
	}
	if env.V == 0 {
		env.V = 1
	}
	if env.TS == 0 {
		env.TS = time.Now().Unix()
	}
	payload, err := json.Marshal(redisWireMessage{UserID: userID, Env: env})
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = b.client.Publish(ctx, redisRealtimeChannel, payload).Err()
}

func (b *RedisBroker) Close() {
	close(b.done)
	if b.pubsub != nil {
		_ = b.pubsub.Close()
	}
	if b.client != nil {
		_ = b.client.Close()
	}
	b.wg.Wait()
}

// NewBroker hub local ou Redis si REDIS_URL est défini.
func NewBroker(hub *Hub, redisURL string) (Broker, func(), error) {
	if redisURL == "" {
		return NewHubBroker(hub), func() {}, nil
	}
	rb, err := NewRedisBroker(hub, redisURL)
	if err != nil {
		return NewHubBroker(hub), func() {}, err
	}
	return rb, rb.Close, nil
}
