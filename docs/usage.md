# Usage Guide

## Quick Start

### Option 1: Local Development (Recommended for development)

```bash
# Start the Go API backend
cd server
go run ./cmd/server
# → Starts on http://localhost:8080

# In another terminal, start the Next.js frontend
cd client
npm install
npm run dev
# → Starts on http://localhost:3000
```

Set the API URL for the frontend:
```bash
# In client/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Option 2: Docker (Recommended for demos/testing)

```bash
docker-compose up --build
# → Starts on http://localhost:8080 (API + UI combined)
```

### Option 3: OpenShift Deployment

```bash
# Build and push image
docker build -t registry.acme.io/gitops-controller:latest .
docker push registry.acme.io/gitops-controller:latest

# Deploy to OpenShift
oc apply -f k8s/deployment.yaml

# Verify
oc get pods -n gitops-system
oc get route -n gitops-system
```

---

## Using the API (curl examples)

### List all apps
```bash
curl http://localhost:8080/api/apps | jq
```

### List staging apps only
```bash
curl "http://localhost:8080/api/apps?env=staging" | jq
```

### Get app details
```bash
curl http://localhost:8080/api/apps/app-001 | jq
```

### Check drift
```bash
curl "http://localhost:8080/api/apps/app-001/drift?env=staging" | jq
```

### Promote/Sync an app
```bash
curl -X POST http://localhost:8080/api/apps/app-001/sync \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "staging",
    "targetRevision": "a1b2c3d",
    "reason": "deploy v2.1",
    "actor": "ritik"
  }' | jq
```

### Rollback an app
```bash
curl -X POST http://localhost:8080/api/apps/app-001/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "staging",
    "targetRevision": "z9y8x7w",
    "reason": "failed deploy, rolling back",
    "actor": "ritik"
  }' | jq
```

### Freeze an app
```bash
curl -X POST http://localhost:8080/api/apps/app-009/freeze \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "staging",
    "freeze": true,
    "reason": "INC-4421: investigating latency",
    "actor": "ritik"
  }' | jq
```

### View audit log
```bash
curl http://localhost:8080/api/audit | jq
```

### Health check
```bash
curl http://localhost:8080/healthz
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Go server port |
| `STATIC_DIR` | ./static | Path to static frontend files |
| `NEXT_PUBLIC_API_URL` | http://localhost:8080 | API URL for frontend (dev mode) |

---

## Building for Production

```bash
# Build frontend
cd client && npm run build && cd ..

# Build Go binary
cd server && CGO_ENABLED=0 go build -o ../gitops-controller ./cmd/server && cd ..

# Run production binary
./gitops-controller
```
