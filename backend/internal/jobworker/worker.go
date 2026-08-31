package jobworker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"archiflow/backend/internal/antivirus"
	"archiflow/backend/internal/jobqueue"
	"archiflow/backend/internal/services"

	"github.com/hibiken/asynq"
	"github.com/minio/minio-go/v7"
)

type Worker struct {
	server    *asynq.Server
	mux       *asynq.ServeMux
	scheduler *asynq.Scheduler
	services  *Services
	clamav    *antivirus.Client
	minio     *minio.Client
}

type Services struct {
	DocumentService      *services.DocumentService
	CollaborationService *services.CollaborationService
	NotificationService  *services.NotificationService
	WorkflowService      *services.WorkflowService
	UploadService        *services.UploadService
	EmailService         *services.EmailService
	SearchService        *services.SearchService
}

func NewWorker(redisURL string, svc *Services, minioClient *minio.Client, clamavAddr string) (*Worker, error) {
	clamavClient := antivirus.NewClient(clamavAddr)

	redisOpt, err := jobqueue.RedisOptFromURL(redisURL)
	if err != nil {
		return nil, err
	}

	server := asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
			ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
				log.Printf("Job failed: type=%s err=%v", task.Type(), err)
			}),
		},
	)

	mux := asynq.NewServeMux()
	registerHandlers(mux, svc, clamavClient, minioClient)

	scheduler := asynq.NewScheduler(
		redisOpt,
		&asynq.SchedulerOpts{Location: time.UTC},
	)
	registerPeriodicJobs(scheduler)

	return &Worker{
		server:    server,
		mux:       mux,
		scheduler: scheduler,
		services:  svc,
		clamav:    clamavClient,
		minio:     minioClient,
	}, nil
}

func (w *Worker) Start() error {
	go func() {
		if err := w.scheduler.Run(); err != nil {
			log.Printf("Scheduler error: %v", err)
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		<-ctx.Done()
		w.Shutdown()
	}()

	log.Println("Worker started")
	return w.server.Run(w.mux)
}

func (w *Worker) Shutdown() {
	w.server.Shutdown()
	w.scheduler.Shutdown()
	log.Println("Worker stopped")
}

func registerHandlers(mux *asynq.ServeMux, c *Services, clamav *antivirus.Client, minioClient *minio.Client) {
	mux.HandleFunc(jobqueue.TypeAntivirusScan, handleAntivirusScan(c, clamav, minioClient))
	mux.HandleFunc(jobqueue.TypeOCRProcess, handleOCRProcess(c, minioClient))
	mux.HandleFunc(jobqueue.TypeThumbnailGen, handleThumbnailGen(c, minioClient))
	mux.HandleFunc(jobqueue.TypeEmailSend, handleEmailSend(c))
	mux.HandleFunc(jobqueue.TypeWebhookDeliver, handleWebhookDeliver())
	mux.HandleFunc(jobqueue.TypeShareExpire, handleShareExpire())
	mux.HandleFunc(jobqueue.TypeWorkflowRemind, handleWorkflowRemind())
	mux.HandleFunc(jobqueue.TypeSearchIndex, handleSearchIndex(c))
	mux.HandleFunc(jobqueue.TypeSearchDelete, handleSearchDelete(c))
}

func registerPeriodicJobs(scheduler *asynq.Scheduler) {
	_, _ = scheduler.Register("@hourly", asynq.NewTask(jobqueue.TypeShareExpire, nil), asynq.TaskID("share-expire-hourly"))
	_, _ = scheduler.Register("@every 30m", asynq.NewTask(jobqueue.TypeWorkflowRemind, nil), asynq.TaskID("workflow-remind-30m"))
}

func handleAntivirusScan(c *Services, clamav *antivirus.Client, minioClient *minio.Client) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var p jobqueue.AntivirusScanPayload
		if err := json.Unmarshal(t.Payload(), &p); err != nil {
			return err
		}
		log.Printf("Antivirus scan: document=%d object=%s bucket=%s", p.DocumentID, p.ObjectName, p.Bucket)

		obj, err := minioClient.GetObject(ctx, p.Bucket, p.ObjectName, minio.GetObjectOptions{})
		if err != nil {
			return fmt.Errorf("get object: %w", err)
		}
		defer obj.Close()

		clean, result, err := clamav.Scan(ctx, obj)
		if err != nil {
			return fmt.Errorf("clamav scan: %w", err)
		}

		log.Printf("Antivirus result for document %d: clean=%v result=%s", p.DocumentID, clean, result)

		if !clean {
			return fmt.Errorf("virus detected: %s", result)
		}

		return nil
	}
}

func handleOCRProcess(c *Services, minioClient *minio.Client) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var p jobqueue.OCRProcessPayload
		if err := json.Unmarshal(t.Payload(), &p); err != nil {
			return err
		}
		log.Printf("OCR process: document=%d object=%s lang=%s", p.DocumentID, p.ObjectName, p.Language)

		obj, err := minioClient.GetObject(ctx, p.Bucket, p.ObjectName, minio.GetObjectOptions{})
		if err != nil {
			return fmt.Errorf("get object: %w", err)
		}
		defer obj.Close()

		tmpDir, err := os.MkdirTemp("", "ocr-*")
		if err != nil {
			return err
		}
		defer os.RemoveAll(tmpDir)

		inputPath := filepath.Join(tmpDir, "input.pdf")
		outputPath := filepath.Join(tmpDir, "output.pdf")

		inFile, err := os.Create(inputPath)
		if err != nil {
			return err
		}
		if _, err := io.Copy(inFile, obj); err != nil {
			inFile.Close()
			return err
		}
		inFile.Close()

		lang := p.Language
		if lang == "" {
			lang = "fra+eng"
		}
		cmd := exec.CommandContext(ctx, "ocrmypdf", "-l", lang, "--sidecar", outputPath+".txt", "--force-ocr", inputPath, outputPath)
		if err := cmd.Run(); err != nil {
			log.Printf("ocrmypdf unavailable for document %d: %v", p.DocumentID, err)
		}

		text := ""
		if sidecar, err := os.ReadFile(outputPath + ".txt"); err == nil {
			text = strings.TrimSpace(string(sidecar))
		}
		if text == "" {
			in, err := os.Open(inputPath)
			if err == nil {
				text = services.ExtractTextFromUpload(p.ObjectName, "", in)
				in.Close()
			}
		}
		if text != "" && c.DocumentService != nil {
			if err := c.DocumentService.UpdateOCRText(p.DocumentID, text); err != nil {
				log.Printf("OCR persist failed for document %d: %v", p.DocumentID, err)
			}
		}
		if c.SearchService != nil && c.DocumentService != nil {
			if doc, err := c.DocumentService.GetByID(p.DocumentID); err == nil {
				_ = c.SearchService.IndexDocument(ctx, doc)
			}
		}
		log.Printf("OCR completed for document %d (chars=%d)", p.DocumentID, len(text))
		return nil
	}
}

func handleSearchIndex(c *Services) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var p jobqueue.SearchIndexPayload
		if err := json.Unmarshal(t.Payload(), &p); err != nil {
			return err
		}
		if c.SearchService == nil || c.DocumentService == nil {
			return nil
		}
		doc, err := c.DocumentService.GetByID(p.DocumentID)
		if err != nil {
			return err
		}
		return c.SearchService.IndexDocument(ctx, doc)
	}
}

func handleSearchDelete(c *Services) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var p jobqueue.SearchIndexPayload
		if err := json.Unmarshal(t.Payload(), &p); err != nil {
			return err
		}
		if c.SearchService == nil {
			return nil
		}
		return c.SearchService.DeleteDocument(ctx, p.DocumentID)
	}
}

func handleThumbnailGen(c *Services, minioClient *minio.Client) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var p jobqueue.ThumbnailGenPayload
		if err := json.Unmarshal(t.Payload(), &p); err != nil {
			return err
		}
		log.Printf("Thumbnail gen: document=%d object=%s page=%d", p.DocumentID, p.ObjectName, p.Page)

		obj, err := minioClient.GetObject(ctx, p.Bucket, p.ObjectName, minio.GetObjectOptions{})
		if err != nil {
			return fmt.Errorf("get object: %w", err)
		}
		defer obj.Close()

		tmpDir, err := os.MkdirTemp("", "thumb-*")
		if err != nil {
			return err
		}
		defer os.RemoveAll(tmpDir)

		inputPath := filepath.Join(tmpDir, "input.pdf")
		thumbPath := filepath.Join(tmpDir, fmt.Sprintf("thumb_%d.jpg", p.Page))

		inFile, err := os.Create(inputPath)
		if err != nil {
			return err
		}
		if _, err := io.Copy(inFile, obj); err != nil {
			inFile.Close()
			return err
		}
		inFile.Close()

		cmd := exec.CommandContext(ctx, "pdftoppm",
			"-jpeg", "-singlefile", "-f", fmt.Sprintf("%d", p.Page+1), "-l", fmt.Sprintf("%d", p.Page+1),
			inputPath, strings.TrimSuffix(thumbPath, ".jpg"))
		if err := cmd.Run(); err != nil {
			log.Printf("Thumbnail generation failed for document %d: %v", p.DocumentID, err)
			return err
		}

		thumbFile, err := os.Open(thumbPath)
		if err != nil {
			return err
		}
		defer thumbFile.Close()

		thumbObjectName := fmt.Sprintf("thumbnails/%d/%d.jpg", p.DocumentID, p.Page)
		_, err = minioClient.PutObject(ctx, p.Bucket, thumbObjectName, thumbFile, -1, minio.PutObjectOptions{
			ContentType: "image/jpeg",
		})
		if err != nil {
			return fmt.Errorf("upload thumbnail: %w", err)
		}

		log.Printf("Thumbnail generated for document %d page %d", p.DocumentID, p.Page)
		return nil
	}
}

func handleEmailSend(c *Services) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var p jobqueue.EmailSendPayload
		if err := json.Unmarshal(t.Payload(), &p); err != nil {
			return err
		}
		log.Printf("Email send: to=%v subject=%s", p.To, p.Subject)
		if c.EmailService == nil {
			return nil
		}
		for _, to := range p.To {
			if err := c.EmailService.Send(to, p.Subject, p.Body); err != nil {
				log.Printf("Email send failed: %v", err)
			}
		}
		return nil
	}
}

func handleWebhookDeliver() func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var p jobqueue.WebhookDeliverPayload
		if err := json.Unmarshal(t.Payload(), &p); err != nil {
			return err
		}
		log.Printf("Webhook deliver: url=%s", p.URL)
		return nil
	}
}

func handleShareExpire() func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var p jobqueue.ShareExpirePayload
		if err := json.Unmarshal(t.Payload(), &p); err != nil {
			log.Printf("Periodic share expire check")
			return nil
		}
		log.Printf("Share expire: share_id=%d", p.ShareID)
		return nil
	}
}

func handleWorkflowRemind() func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var p jobqueue.WorkflowRemindPayload
		if err := json.Unmarshal(t.Payload(), &p); err != nil {
			log.Printf("Periodic workflow remind check")
			return nil
		}
		log.Printf("Workflow remind: instance=%d step=%d level=%d", p.InstanceID, p.StepID, p.Level)
		return nil
	}
}
