# Build stage
FROM golang:1.22.12-alpine AS builder

WORKDIR /app

# Install dependencies for CGO
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/api/main.go

# Final stage
FROM alpine:3.20.3

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

# Copy the binary from builder
COPY --from=builder /app/main .
RUN chown app:app /app/main

USER app

# Expose port
EXPOSE 5000

# Run the binary
CMD ["./main"]
