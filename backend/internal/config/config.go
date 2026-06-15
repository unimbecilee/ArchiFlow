package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL        string
	MinioEndpoint      string
	MinioAccessKey     string
	MinioSecretKey     string
	MinioUseSSL        bool
	MinioArchivesBucket  string
	MinioDocumentsBucket string
	JWTSecret          string
	JWTRefreshSecret   string
	ServerPort         string
	Environment        string
	PydioCellsURL      string
	PydioWebdavURL     string
	PydioAPIToken      string
}

func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		// .env file is optional in production
	}

	cfg := &Config{
		DatabaseURL:         getEnv("DATABASE_URL", "postgresql://archiflow:archiflow_secret@localhost:5432/archiflow?sslmode=disable"),
		MinioEndpoint:       getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey:      getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey:      getEnv("MINIO_SECRET_KEY", "minioadmin123"),
		MinioUseSSL:         getEnv("MINIO_USE_SSL", "false") == "true",
		MinioArchivesBucket:  getEnv("MINIO_ARCHIVES_BUCKET", "archives-requests"),
		MinioDocumentsBucket: getEnv("MINIO_DOCUMENTS_BUCKET", "archiflow-documents"),
		JWTSecret:           getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
		JWTRefreshSecret:    getEnv("JWT_REFRESH_SECRET", "your-super-secret-refresh-key-change-in-production"),
		ServerPort:          getEnv("SERVER_PORT", "5000"),
		Environment:         getEnv("ENVIRONMENT", "development"),
		PydioCellsURL:       getEnv("PYDIO_CELLS_URL", "http://localhost:4001"),
		PydioWebdavURL:      getEnv("PYDIO_WEBDAV_URL", "http://localhost:4001/dav"),
		PydioAPIToken:       getEnv("PYDIO_API_TOKEN", "archiflow_pydio_api_token_2024"),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}
	if err := ValidateSecurityForEnv(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if c.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}
	if c.JWTRefreshSecret == "" {
		return fmt.Errorf("JWT_REFRESH_SECRET is required")
	}
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
