package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"archiflow/backend/internal/config"
	"archiflow/backend/internal/handlers"
	"archiflow/backend/internal/middleware"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/realtime"
	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/seed"
	"archiflow/backend/internal/services"
	"archiflow/backend/internal/utils"

	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
	"go.uber.org/zap"
)

func main() {
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}
	for _, w := range config.SecurityWarnings() {
		logger.Warn("security warning", zap.String("detail", w))
	}

	db, err := config.InitDatabase(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.UserRefreshToken{},
		&models.Folder{},
		&models.Document{},
		&models.ArchiveRequest{},
		&models.PydioArchiveRequest{},
		&models.PydioWebhookLog{},
		&models.PydioDocumentSync{},
		&models.Workflow{},
		&models.WorkflowStep{},
		&models.WorkflowApprover{},
		&models.WorkflowInstance{},
		&models.WorkflowApproval{},
		&models.DocumentShare{},
		&models.DocumentComment{},
		&models.DocumentVersion{},
		&models.Tag{},
		&models.DocumentTagLink{},
		&models.Notification{},
		&models.DocumentFavorite{},
		&models.SftpIngestEvent{},
		&models.ServiceAccount{},
		&models.AuditEvent{},
		&models.AccessPolicy{},
		&models.UploadSession{},
		&models.UploadPart{},
	); err != nil {
		logger.Fatal("Failed to migrate database", zap.Error(err))
	}
	logger.Info("Database migrated successfully")

	if cfg.MinioEndpoint != "" {
		_, err = config.InitMinio(cfg.MinioEndpoint, cfg.MinioAccessKey, cfg.MinioSecretKey, cfg.MinioUseSSL)
		if err != nil {
			logger.Warn("Failed to initialize MinIO", zap.Error(err))
		} else {
			if err := config.EnsureBucket(cfg.MinioDocumentsBucket); err != nil {
				logger.Warn("EnsureBucket documents failed", zap.Error(err))
			}
			if err := config.EnsureBucket(cfg.MinioArchivesBucket); err != nil {
				logger.Warn("EnsureBucket archives failed", zap.Error(err))
			}
			if err := config.EnsureBucket(cfg.MinioSFTPInboxBucket); err != nil {
				logger.Warn("EnsureBucket sftp inbox failed", zap.Error(err))
			}
			publicEndpoint := os.Getenv("MINIO_PUBLIC_ENDPOINT")
			if publicEndpoint == "" {
				publicEndpoint = cfg.MinioEndpoint
			}
			publicSSL := os.Getenv("MINIO_PUBLIC_USE_SSL") == "true"
			if err := config.InitMinioPublicURL(publicEndpoint, publicSSL, cfg.MinioAccessKey, cfg.MinioSecretKey); err != nil {
				logger.Warn("MinIO public presign client init failed", zap.Error(err))
			}
		}
	}

	jwtUtil := utils.NewJWTUtil(cfg.JWTSecret, cfg.JWTRefreshSecret)

	userRepo := repository.NewUserRepository(db)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db)
	folderRepo := repository.NewFolderRepository(db)
	documentRepo := repository.NewDocumentRepository(db)
	uploadRepo := repository.NewUploadRepository(db)
	archiveRepo := repository.NewArchiveRepository(db)
	workflowRepo := repository.NewWorkflowRepository(db)
	collabRepo := repository.NewCollaborationRepository(db)
	favRepo := repository.NewFavoriteRepository(db)

	emailService := services.NewEmailService()
	pydioIntegration := services.NewPydioIntegrationService()
	userPydioSync := services.NewUserPydioSync(pydioIntegration, userRepo)
	sftpRepo := repository.NewSftpRepository(db)
	sftpGoAdmin := services.NewSftpGoAdminClient()
	userSftpGoSync := services.NewUserSftpGoSync(sftpGoAdmin, userRepo, sftpRepo)
	auditService := services.NewAuditService(sftpRepo)
	seed.DefaultWorkflows(db)
	seed.EnsureValidationWorkflowApprovers(db)
	seed.DefaultAdmin(db, userPydioSync)
	seed.DefaultManager(db, userPydioSync)
	seed.DefaultValidator(db, userPydioSync)
	seed.DefaultArchivist(db, userPydioSync)
	seed.BackfillSftpDefaults(db)
	sessionService := services.NewSessionService(userRepo, refreshTokenRepo, jwtUtil)
	authService := services.NewAuthService(userRepo, jwtUtil, sessionService, userPydioSync, userSftpGoSync)
	folderService := services.NewFolderService(folderRepo, documentRepo)
	documentService := services.NewDocumentService(documentRepo, folderRepo, cfg.MinioDocumentsBucket)
	archiveService := services.NewArchiveService(archiveRepo, cfg.MinioArchivesBucket)
	rtHub := realtime.NewHub()
	rtBroker, closeBroker, brokerErr := realtime.NewBroker(rtHub, os.Getenv("REDIS_URL"))
	if brokerErr != nil {
		logger.Warn("Redis realtime unavailable, using in-memory hub only", zap.Error(brokerErr))
	} else if os.Getenv("REDIS_URL") != "" {
		logger.Info("Realtime broker: Redis pub/sub")
	}
	defer closeBroker()
	notificationRealtime := services.NewNotificationRealtime(collabRepo, rtBroker)
	workflowRealtime := services.NewWorkflowRealtime(workflowRepo, userRepo, rtBroker)
	uploadQuotaService := services.NewUploadQuotaService(documentRepo, uploadRepo)
	uploadService := services.NewUploadService(uploadRepo, documentRepo, folderRepo, uploadQuotaService, notificationRealtime, cfg.MinioDocumentsBucket)
	notificationService := services.NewNotificationService(collabRepo, emailService, userRepo, notificationRealtime)
	workflowService := services.NewWorkflowService(workflowRepo, documentRepo, collabRepo, userRepo, notificationService, workflowRealtime)
	if n := workflowService.RepairStuckInstances(); n > 0 {
		logger.Info("Repaired stuck workflow instances", zap.Int("count", n))
	}
	if n := workflowService.NotifyStalePendingApprovals(); n > 0 {
		logger.Info("Sent stale workflow reminders", zap.Int("count", n))
	}
	collaborationService := services.NewCollaborationService(collabRepo, documentRepo, userRepo, workflowRepo, cfg.MinioDocumentsBucket, notificationRealtime)
	policyService := services.NewPolicyService(collaborationService, documentRepo, userRepo, sftpRepo)
	officeService := services.NewOfficeService(collaborationService, userRepo)
	favoriteService := services.NewFavoriteService(favRepo, documentRepo, collaborationService)
	adminService := services.NewAdminService(userRepo, userPydioSync, userSftpGoSync, emailService, sessionService)
	sftpAuthService := services.NewSftpGoAuthService(userRepo, sftpRepo, auditService)
	sftpIngestService := services.NewSFTPIngestService(
		sftpRepo, documentRepo, userRepo, auditService, notificationRealtime,
		cfg.MinioDocumentsBucket, cfg.MinioSFTPInboxBucket, collaborationService,
	)

	authHandler := handlers.NewAuthHandler(authService)
	folderHandler := handlers.NewFolderHandler(folderService)
	documentHandler := handlers.NewDocumentHandler(documentService, collaborationService, policyService, auditService)
	uploadHandler := handlers.NewUploadHandler(uploadService)
	collaborationHandler := handlers.NewCollaborationHandler(collaborationService, auditService, policyService)
	favoriteHandler := handlers.NewFavoriteHandler(favoriteService, documentHandler)
	adminHandler := handlers.NewAdminHandler(adminService)
	archivesHandler := handlers.NewArchivesRequestsHandler(archiveService)
	pydioHandler := handlers.NewPydioHandler(archiveService, documentService)
	integrationsHandler := handlers.NewIntegrationsHandler(pydioIntegration, userPydioSync)
	sftpGoHandler := handlers.NewSftpGoHandler(sftpAuthService, sftpIngestService, auditService)
	workflowHandler := handlers.NewWorkflowHandler(workflowService)
	adminWorkflowHandler := handlers.NewAdminWorkflowHandler(workflowService)
	officeHandler := handlers.NewOfficeHandler(officeService)
	dashboardHandler := handlers.NewDashboardHandler(documentRepo, collabRepo, favRepo, workflowService)
	wsHandler := handlers.NewWSHandler(rtHub, jwtUtil, sessionService)

	e := echo.New()
	e.Use(middleware.RequestTimer())
	e.Use(middleware.Logger(logger))
	e.Use(middleware.SecurityHeaders())
	e.Use(middleware.CORS())
	e.Use(echomiddleware.Recover())

	api := e.Group("/api")
	api.GET("/auth/config", authHandler.PublicConfig)

	authPublic := api.Group("/auth")
	authPublic.Use(middleware.AuthRateLimit())
	authPublic.POST("/register", authHandler.Register)
	authPublic.POST("/login", authHandler.Login)
	authPublic.POST("/refresh", authHandler.RefreshToken)
	authPublic.POST("/logout", authHandler.ClearSession)

	// WebSocket : ticket court dans ws_handler (POST /api/ws/ticket pour obtenir le ticket)
	api.GET("/ws", wsHandler.Connect)

	// OnlyOffice Document Server (auth par token HMAC, pas JWT utilisateur)
	api.GET("/office/files/:id/:token", officeHandler.DownloadFile)
	api.POST("/office/callback/:id/:token", officeHandler.Callback)

	// SFTPGo MFT — external auth + webhooks (pas de JWT utilisateur)
	sftpgoAPI := api.Group("/integrations/sftpgo")
	sftpgoAPI.POST("/auth", sftpGoHandler.Auth, middleware.AuthRateLimit())
	sftpgoAPI.POST("/hooks", sftpGoHandler.Hooks, middleware.SftpGoWebhookAuth())

	protected := api.Group("")
	protected.Use(middleware.JWTAuth(jwtUtil, sessionService))
	protected.Use(middleware.ProtectedRateLimit())
	protected.Use(middleware.MustChangePassword(userRepo))
	protected.POST("/auth/logout", authHandler.Logout)
	protected.GET("/auth/me", authHandler.GetMe)
	protected.PUT("/auth/me", authHandler.UpdateProfile)
	protected.PUT("/auth/change-password", authHandler.ChangePassword)
	protected.GET("/integrations/pydio", integrationsHandler.GetPydioConfig)
	protected.GET("/integrations/pydio/sso-launch", integrationsHandler.PydioSSOLaunch)

	// GED — dossiers & documents
	protected.GET("/folders", folderHandler.List)
	protected.GET("/folders/flat", folderHandler.ListFlat)
	protected.POST("/folders", folderHandler.Create)
	protected.GET("/folders/:id/breadcrumb", folderHandler.Breadcrumb)
	protected.GET("/folders/:id", folderHandler.Get)
	protected.PUT("/folders/:id", folderHandler.Update)
	protected.DELETE("/folders/:id", folderHandler.Delete)

	protected.GET("/dashboard/stats", dashboardHandler.Stats)

	protected.GET("/documents/my", documentHandler.ListMy)
	protected.GET("/documents/search", documentHandler.Search, middleware.APIRateLimit())
	protected.GET("/documents/recent", documentHandler.ListRecent)
	protected.GET("/documents/trash", documentHandler.ListTrash)
	protected.POST("/documents/upload", documentHandler.Upload, middleware.UploadRateLimit())

	protected.POST("/upload/sessions", uploadHandler.InitSession, middleware.UploadInitRateLimit())
	protected.GET("/upload/sessions/:id", uploadHandler.GetStatus)
	protected.GET("/upload/sessions/:id/parts/:n/url", uploadHandler.PresignPart)
	protected.POST("/upload/sessions/:id/complete", uploadHandler.Complete)
	protected.DELETE("/upload/sessions/:id", uploadHandler.Abort)

	protected.POST("/documents/:id/restore", documentHandler.Restore)
	protected.POST("/documents/:id/lock", documentHandler.Lock)
	protected.DELETE("/documents/:id/lock", documentHandler.Unlock)
	protected.GET("/documents/:id/favorite", favoriteHandler.Status)
	protected.POST("/documents/:id/favorite", favoriteHandler.Add)
	protected.DELETE("/documents/:id/favorite", favoriteHandler.Remove)
	protected.GET("/documents/:id/content", collaborationHandler.GetDocumentContent)
	protected.GET("/documents/:id/office/config", officeHandler.EditorConfig)
	protected.GET("/documents/:id", documentHandler.Get)
	protected.PATCH("/documents/:id", documentHandler.Patch)
	protected.GET("/documents/:id/download", documentHandler.Download)
	protected.GET("/documents/:id/preview", documentHandler.Preview)
	protected.DELETE("/documents/:id", documentHandler.Delete)

	protected.GET("/workflows", workflowHandler.ListWorkflows)
	protected.POST("/workflows/:id/start", workflowHandler.Start)
	protected.POST("/workflows/validation/start", workflowHandler.StartValidation)
	protected.POST("/workflows/validation/restart", workflowHandler.RestartValidation)
	protected.GET("/documents/:id/validation-context", workflowHandler.ValidationContext)
	protected.GET("/workflows/instances/pending", workflowHandler.Pending)
	protected.GET("/workflows/instances/in-progress", workflowHandler.InProgress)
	protected.GET("/workflows/instances/completed", workflowHandler.Completed)
	protected.GET("/workflows/instances/my-decisions", workflowHandler.MyDecisions)
	protected.GET("/workflows/instances/:id", workflowHandler.GetInstance)
	protected.POST("/workflows/instances/:id/approve", workflowHandler.Approve)
	protected.POST("/workflows/instances/:id/reject", workflowHandler.Reject)
	protected.POST("/workflows/instances/:id/cancel", workflowHandler.Cancel)

	protected.GET("/documents/shared-with-me", collaborationHandler.SharedWithMe)
	protected.POST("/documents/:id/share", collaborationHandler.Share)
	protected.GET("/documents/:id/comments", collaborationHandler.ListComments)
	protected.POST("/documents/:id/comments", collaborationHandler.AddComment)
	protected.DELETE("/documents/:id/comments/:commentId", collaborationHandler.DeleteComment)
	protected.GET("/documents/:id/versions/:versionId/download", collaborationHandler.DownloadVersion)
	protected.GET("/documents/:id/versions/:versionId/preview", collaborationHandler.PreviewVersion)
	protected.GET("/documents/:id/versions", collaborationHandler.ListVersions)
	protected.POST("/documents/:id/versions", collaborationHandler.UploadVersion)
	protected.POST("/documents/:id/versions/edit", collaborationHandler.SaveDocumentEdit)
	protected.GET("/documents/:id/tags", collaborationHandler.GetDocumentTags)
	protected.POST("/documents/:id/tags", collaborationHandler.AddDocumentTag)
	protected.DELETE("/documents/:id/tags/:tagId", collaborationHandler.RemoveDocumentTag)
	protected.GET("/tags", collaborationHandler.ListTags)
	protected.GET("/notifications", collaborationHandler.ListNotifications)
	protected.GET("/notifications/stream", collaborationHandler.StreamNotifications)
	protected.PUT("/notifications/:id/read", collaborationHandler.MarkNotificationRead)
	protected.PUT("/notifications/read-all", collaborationHandler.MarkAllRead)

	protected.GET("/favorites", favoriteHandler.List)

	protected.POST("/ws/ticket", wsHandler.IssueTicket)

	admin := protected.Group("/admin", middleware.RequireAdmin())
	admin.GET("/users", adminHandler.ListUsers)
	admin.POST("/users", adminHandler.CreateUser)
	admin.GET("/users/:id", adminHandler.GetUser)
	admin.PUT("/users/:id", adminHandler.PutUser)
	admin.PATCH("/users/:id", adminHandler.PatchUser)
	admin.POST("/users/:id/resend-credentials", adminHandler.ResendCredentials)
	admin.POST("/users/:id/sync-pydio", adminHandler.SyncPydio)
	admin.POST("/users/:id/service-accounts", adminHandler.CreateServiceAccount)
	admin.GET("/users/:id/service-accounts", adminHandler.ListServiceAccounts)
	admin.DELETE("/users/:id", adminHandler.DeleteUser)

	admin.GET("/workflows", adminWorkflowHandler.List)
	admin.GET("/workflows/:id", adminWorkflowHandler.Get)
	admin.POST("/workflows", adminWorkflowHandler.Create)
	admin.PUT("/workflows/:id", adminWorkflowHandler.Put)
	admin.DELETE("/workflows/:id", adminWorkflowHandler.Delete)

	pydioAPI := e.Group("/api/v1")
	pydioAPI.Use(middleware.PydioAPIRateLimit())
	pydioAPI.Use(middleware.PydioAPIAuth())
	pydioAPI.POST("/archives-requests", archivesHandler.Create)
	pydioAPI.GET("/archives-requests", archivesHandler.List)
	pydioAPI.GET("/pydio/health", pydioHandler.Health)
	pydioAPI.GET("/pydio/stats", pydioHandler.Stats)
	pydioAPI.POST("/pydio/archive-requests", pydioHandler.CreateArchiveRequest)
	pydioAPI.GET("/pydio/archive-requests", pydioHandler.ListArchiveRequests)
	pydioAPI.POST("/pydio/documents/sync", pydioHandler.SyncDocument)
	pydioAPI.GET("/pydio/documents/sync", pydioHandler.ListSync)
	pydioAPI.DELETE("/pydio/documents/sync/:node_id", pydioHandler.DeleteSync)
	pydioAPI.POST("/pydio/webhooks/node-created", pydioHandler.WebhookNodeCreated)
	pydioAPI.POST("/pydio/webhooks/node-updated", pydioHandler.WebhookNodeUpdated)
	pydioAPI.POST("/pydio/webhooks/node-deleted", pydioHandler.WebhookNodeDeleted)

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]any{
			"status":         "healthy",
			"upload_metrics": services.UploadMetricsSnapshot(),
		})
	})

	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			if n, err := uploadService.CleanupExpired(context.Background()); err != nil {
				logger.Warn("upload cleanup failed", zap.Error(err))
			} else if n > 0 {
				logger.Info("aborted expired upload sessions", zap.Int("count", n))
			}
		}
	}()

	logger.Info("Starting server", zap.String("port", cfg.ServerPort))
	if err := e.Start(":" + cfg.ServerPort); err != nil {
		logger.Fatal("Server failed to start", zap.Error(err))
	}
}
