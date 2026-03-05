# Knowledge Transfer (KT) Document

## Project Overview

**GitOps Release & Drift Controller** is an internal platform tool that helps engineering teams release safely on OpenShift using GitOps practices.

### Purpose
- Detect configuration drift between Git desired state and live cluster state
- Provide safe release controls (promote/sync, rollback, freeze) with guardrails
- Surface rollout health and failure context
- Maintain audit trail of all actions

### Target Users
- **Platform Engineers / SREs**: Manage release safety, drift, incident triage
- **Application Engineers**: Self-serve status checks and safe rollback
- **Engineering Managers**: Auditability and release health visibility

---

## Architecture Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js + React + Redux Toolkit | Terminal-style 3-pane web UI |
| Backend | Go 1.18 + gorilla/mux | REST API, drift engine, audit |
| Metrics | Prometheus client_golang | Observability counters/histograms |
| Container | Docker (multi-stage build) | Packaging and deployment |
| Platform | OpenShift / Kubernetes | Runtime environment |
| CI/CD | Jenkins Pipeline | Build, test, deploy automation |

### Key Design Decisions

1. **In-memory store (MVP)** — No external database dependency for MVP. Seeded with 10 realistic apps. Easy to swap for PostgreSQL in Phase 2.

2. **Terminal-aesthetic UI** — Monospace fonts, dark theme, keyboard-first navigation. Feels like htop/kubectl — designed for engineers who live in terminals.

3. **Simulated drift engine** — Generates deterministic, realistic resource-level diffs. Ready to be replaced with real Argo CD / OpenShift API integration.

4. **Idempotent actions** — All mutations accept a `requestId` for idempotency. Audit trail records every action with actor, timestamp, and result.

5. **Static export** — Frontend is exported as static HTML/JS and served by the Go binary, creating a single-binary deployment.

---

## Repository Structure

```
gitops/
├── server/                    # Go backend
│   ├── cmd/server/main.go     # Entry point
│   └── internal/
│       ├── api/               # REST handlers, middleware, metrics
│       ├── drift/             # Drift computation engine
│       ├── models/            # Data structures
│       └── store/             # In-memory data store
├── client/                    # Next.js frontend
│   └── src/
│       ├── api/               # API client
│       ├── components/        # React components
│       ├── pages/             # Next.js pages
│       ├── store/             # Redux slices
│       └── styles/            # CSS
├── docs/                      # Documentation
├── k8s/                       # OpenShift manifests
├── Dockerfile                 # Multi-stage build
├── docker-compose.yml         # Local development
├── Jenkinsfile                # CI/CD pipeline
└── .gitignore
```

---

## Development Setup

### Prerequisites
- Go 1.18+
- Node.js 18+
- Docker (optional)

### Run Locally

```bash
# Terminal 1: Start Go API server
cd server
go run ./cmd/server

# Terminal 2: Start Next.js dev server
cd client
npm install
npm run dev
```

Access: http://localhost:3000 (frontend) / http://localhost:8080 (API)

### Run with Docker

```bash
docker-compose up --build
```

Access: http://localhost:8080

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/apps | List apps with status |
| GET | /api/apps/{id} | App detail with releases/events/audit |
| GET | /api/apps/{id}/drift | Drift analysis report |
| GET | /api/apps/{id}/events | Cluster events |
| GET | /api/apps/{id}/releases | Release history |
| POST | /api/apps/{id}/sync | Promote/sync to revision |
| POST | /api/apps/{id}/rollback | Rollback to previous revision |
| POST | /api/apps/{id}/freeze | Freeze/unfreeze app |
| GET | /api/audit | Audit log |
| GET | /healthz | Health check |
| GET | /metrics | Prometheus metrics |

---

## Key Concepts

### Drift Severity Levels
- **NONE** — Live matches desired state
- **LOW** — Minor config differences (e.g., log levels)
- **MEDIUM** — Resource limits, HPA settings changed
- **HIGH** — Image mismatch, replica count wrong, secrets stale

### Action Safety Guardrails
- Frozen apps reject all sync/rollback attempts
- Every action requires explicit confirmation (y/n)
- Audit trail records actor, action, result, timestamp
- RequestID enables idempotent retries

### Monitoring
- Prometheus metrics at `/metrics`
- Structured JSON logs with correlation IDs
- Health endpoint at `/healthz` for k8s probes

---

## Phase Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1 (MVP)** | App list, drift, promote, audit, deployment | ✓ Complete |
| **Phase 2** | Rollback+freeze hardening, metrics dashboard, RBAC | Planned |
| **Phase 3** | AI-assisted diff explanation, multi-cluster | Future |
