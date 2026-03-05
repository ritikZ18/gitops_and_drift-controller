# ──────────────────────────────────────────────────
# Stage 1: Build React (Next.js) frontend
# ──────────────────────────────────────────────────
FROM node:18-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --production=false
COPY client/ ./
RUN npm run build
# Export static files for Go to serve
RUN npx next export -o out || true

# ──────────────────────────────────────────────────
# Stage 2: Build Go API server
# ──────────────────────────────────────────────────
FROM golang:1.18-alpine AS backend-builder
WORKDIR /app/server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /gitops-controller ./cmd/server

# ──────────────────────────────────────────────────
# Stage 3: Production runtime
# ──────────────────────────────────────────────────
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata && \
    adduser -D -u 1001 appuser

WORKDIR /app

COPY --from=backend-builder /gitops-controller .
COPY --from=frontend-builder /app/client/.next/static ./static/_next/static
COPY --from=frontend-builder /app/client/out ./static

RUN chown -R appuser:appuser /app
USER appuser

ENV PORT=8080
ENV STATIC_DIR=./static
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz || exit 1

ENTRYPOINT ["./gitops-controller"]
