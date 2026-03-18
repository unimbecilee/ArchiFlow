# Stage 1: Build
FROM golang:1.23-alpine AS builder

WORKDIR /build

# Installer les dépendances nécessaires pour la compilation
# IMPORTANT: Mettre à jour les dépôts avant d'installer
RUN apk update && apk add --no-cache git make

# Copier les fichiers nécessaires pour télécharger les dépendances
COPY go.mod go.sum ./
RUN go mod download

# Copier tout le code source
COPY . .

# Compiler le binaire en mode PRODUCTION (sans tag dev)
# Utiliser directement go build au lieu de make main pour être sûr
RUN env CGO_ENABLED=0 go build -a -trimpath \
    -ldflags "-X github.com/pydio/cells/v4/common.version=4.4.16 \
    -X github.com/pydio/cells/v4/common.BuildStamp=$(date -u +%Y-%m-%dT%H:%M:%S) \
    -X github.com/pydio/cells/v4/common.BuildRevision=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')" \
    -o cells .

# Stage 2: Runtime
FROM alpine:latest

# Mettre à jour les dépôts avant l'installation
RUN apk add --no-cache \
    ca-certificates \
    bash \
    mysql-client

ENV CELLS_WORKING_DIR=/var/cells

WORKDIR /app

# Copier le binaire compilé depuis le stage builder
COPY --from=builder /build/cells /app/cells
COPY entrypoint.sh /app/entrypoint.sh
COPY configure.sh /app/configure.sh
COPY .env /app/.env

RUN chmod +x /app/cells /app/entrypoint.sh /app/configure.sh

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
