package main

import (
	"log"
	"os"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/jobworker"
	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/services"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

func main() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://redis:6379/0"
	}

	clamavAddr := os.Getenv("CLAMAV_ADDR")
	if clamavAddr == "" {
		clamavAddr = "clamav:3310"
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal("config load:", err)
	}

	db, err := config.InitDatabase(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("db init:", err)
	}

	sqlDB, _ := db.DB()
	defer sqlDB.Close()

	minioClient, err := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
	})
	if err != nil {
		log.Fatal("minio client:", err)
	}

	emailService := services.NewEmailService()
	documentRepo := repository.NewDocumentRepository(db)
	folderRepo := repository.NewFolderRepository(db)
	documentService := services.NewDocumentService(documentRepo, folderRepo, cfg.MinioDocumentsBucket)
	searchService := services.NewSearchService(documentRepo)
	documentService.SetSearch(searchService)

	container := &jobworker.Services{
		DocumentService:      documentService,
		CollaborationService: nil,
		NotificationService:  nil,
		WorkflowService:      nil,
		UploadService:        nil,
		EmailService:         emailService,
		SearchService:        searchService,
	}

	worker, err := jobworker.NewWorker(redisURL, container, minioClient, clamavAddr)
	if err != nil {
		log.Fatal("worker init:", err)
	}

	if err := worker.Start(); err != nil {
		log.Fatal("worker run:", err)
	}
}