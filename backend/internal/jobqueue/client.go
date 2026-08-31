package jobqueue

import (
	"context"
	"encoding/json"
	"time"

	"github.com/hibiken/asynq"
)

type Client struct {
	client *asynq.Client
}

func NewClient(redisURL string) (*Client, error) {
	opt, err := RedisOptFromURL(redisURL)
	if err != nil {
		return nil, err
	}
	client := asynq.NewClient(opt)
	return &Client{client: client}, nil
}

func (c *Client) Close() error {
	return c.client.Close()
}

func (c *Client) Enqueue(ctx context.Context, task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
	return c.client.EnqueueContext(ctx, task, opts...)
}

func (c *Client) EnqueueIn(ctx context.Context, delay time.Duration, task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
	return c.client.EnqueueContext(ctx, task, append(opts, asynq.ProcessIn(delay))...)
}

type Inspector struct {
	inspector *asynq.Inspector
}

func NewInspector(redisURL string) (*Inspector, error) {
	opt, err := RedisOptFromURL(redisURL)
	if err != nil {
		return nil, err
	}
	return &Inspector{inspector: asynq.NewInspector(opt)}, nil
}

func (i *Inspector) Close() error {
	return i.inspector.Close()
}

// Job payloads
const (
	TypeAntivirusScan   = "antivirus:scan"
	TypeOCRProcess      = "ocr:process"
	TypeThumbnailGen    = "thumbnail:generate"
	TypeEmailSend       = "email:send"
	TypeWebhookDeliver  = "webhook:deliver"
	TypeShareExpire     = "share:expire"
	TypeWorkflowRemind  = "workflow:remind"
	TypeSearchIndex     = "search:index"
	TypeSearchDelete    = "search:delete"
)

type AntivirusScanPayload struct {
	DocumentID uint   `json:"document_id"`
	ObjectName string `json:"object_name"`
	Bucket     string `json:"bucket"`
}

type OCRProcessPayload struct {
	DocumentID uint   `json:"document_id"`
	ObjectName string `json:"object_name"`
	Bucket     string `json:"bucket"`
	Language   string `json:"language"`
}

type ThumbnailGenPayload struct {
	DocumentID uint   `json:"document_id"`
	ObjectName string `json:"object_name"`
	Bucket     string `json:"bucket"`
	Page       int    `json:"page"`
}

type EmailSendPayload struct {
	To           []string       `json:"to"`
	Subject      string         `json:"subject"`
	Body         string         `json:"body"`
	Template     string         `json:"template,omitempty"`
	TemplateData map[string]any `json:"template_data,omitempty"`
}

type WebhookDeliverPayload struct {
	URL         string            `json:"url"`
	Method      string            `json:"method"`
	Headers     map[string]string `json:"headers"`
	Body        json.RawMessage   `json:"body"`
	MaxRetries  int               `json:"max_retries"`
}

type ShareExpirePayload struct {
	ShareID uint `json:"share_id"`
}

type WorkflowRemindPayload struct {
	InstanceID uint `json:"instance_id"`
	StepID     uint `json:"step_id"`
	Level      int  `json:"level"`
}

type SearchIndexPayload struct {
	DocumentID uint `json:"document_id"`
}

func NewAntivirusScanTask(payload AntivirusScanPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeAntivirusScan, data), nil
}

func NewOCRProcessTask(payload OCRProcessPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeOCRProcess, data), nil
}

func NewThumbnailGenTask(payload ThumbnailGenPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeThumbnailGen, data), nil
}

func NewEmailSendTask(payload EmailSendPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeEmailSend, data), nil
}

func NewWebhookDeliverTask(payload WebhookDeliverPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeWebhookDeliver, data), nil
}

func NewShareExpireTask(payload ShareExpirePayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeShareExpire, data), nil
}

func NewWorkflowRemindTask(payload WorkflowRemindPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeWorkflowRemind, data), nil
}

func NewSearchIndexTask(payload SearchIndexPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeSearchIndex, data), nil
}

func NewSearchDeleteTask(payload SearchIndexPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeSearchDelete, data), nil
}