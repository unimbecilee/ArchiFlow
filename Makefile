.PHONY: dev build up down logs backend frontend psql shell

# Development commands
dev:
	docker-compose up --build

up:
	docker-compose up -d

down:
	docker-compose down

down-volumes:
	docker-compose down -v

# Logs
logs:
	docker-compose logs -f

backend-logs:
	docker-compose logs -f backend

frontend-logs:
	docker-compose logs -f frontend

postgres-logs:
	docker-compose logs -f postgres

# Backend development (local)
backend-dev:
	cd backend && go run cmd/api/main.go

backend-build:
	cd backend && go build -o bin/api cmd/api/main.go

# Frontend development (local)
frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

# Database
psql:
	docker-compose exec postgres psql -U archiflow -d archiflow

migrate:
	cd backend && go run cmd/api/main.go migrate

# Utilities
shell-backend:
	docker-compose exec backend sh

shell-frontend:
	docker-compose exec frontend sh

shell-postgres:
	docker-compose exec postgres sh

# Clean
clean:
	docker-compose down -v
	docker system prune -f

# Test
backend-test:
	cd backend && go test ./...

frontend-test:
	cd frontend && npm test
