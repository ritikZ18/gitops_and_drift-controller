# GitOps Release & Drift Controller

A platform-grade internal tool for managing OpenShift releases using GitOps practices. Built with **Go** (REST API) + **Next.js/React/Redux** (terminalistic web UI).

```
┌──────────────────────────────────────────────────────────────────────────┐
│ gitopsctl-web  ▸ cluster: prod-us1  ▸ env: staging  ▸ user: ritik      │
├───────────────┬───────────────────────────────┬─────────────────────────┤
│ APPS (list)   │ DETAILS (selected app)        │ EVENTS / DRIFT / AUDIT  │
│               │                               │                         │
│ [/] search    │ app: payments-api             │ rollout: Progressing    │
│               │ sync:    OUT_OF_SYNC          │ last error: ImagePull   │
│ > orders-api  │ drift:   HIGH (12 resources)  │                         │
│   payments-api│ health:  DEGRADED             │ [P]romote [R]ollback    │
│   auth-api    │ last sync: 12m ago            │ [F]reeze                │
└───────────────┴───────────────────────────────┴─────────────────────────┘
```

## Features

- **Drift Detection** — Resource-level diffs between Git desired state and live cluster
- **Release Controls** — Promote/sync, rollback, freeze with confirmation guardrails
- **Rollout Health** — Real-time status with failure diagnostics and cluster events
- **Audit Trail** — Every action logged with actor, timestamp, and outcome
- **Keyboard-First** — Full workflow without touching the mouse (j/k/p/r/f/?)
- **Prometheus Metrics** — Sync counts, drift totals, rollout duration, API errors

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.18, gorilla/mux, Prometheus |
| Frontend | Next.js, React, Redux Toolkit |
| Styling | Custom terminal-dark CSS (monospace) |
| Container | Docker (multi-stage Alpine) |
| Platform | OpenShift / Kubernetes |
| CI/CD | Jenkins Pipeline |

## Quick Start

### Local Development

```bash
# Terminal 1: API server
cd server && go run ./cmd/server

# Terminal 2: Frontend dev server
cd client && npm install && npm run dev
```

### Docker

```bash
docker-compose up --build
# → http://localhost:8080
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j/k` | Navigate apps |
| `/` | Search |
| `p` | Promote |
| `r` | Rollback |
| `f` | Freeze |
| `1-4` | Switch tabs |
| `?` | Help |

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [User Manual](docs/user-manual.md)
- [KT Document](docs/kt-document.md)
- [Usage Guide](docs/usage.md)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/apps` | List apps |
| GET | `/api/apps/{id}` | App detail |
| GET | `/api/apps/{id}/drift` | Drift report |
| POST | `/api/apps/{id}/sync` | Promote/sync |
| POST | `/api/apps/{id}/rollback` | Rollback |
| POST | `/api/apps/{id}/freeze` | Freeze/unfreeze |
| GET | `/api/audit` | Audit log |
| GET | `/healthz` | Health check |
| GET | `/metrics` | Prometheus metrics |

## Project Structure

```
gitops/
├── server/                    # Go backend
│   ├── cmd/server/main.go     # Entry point
│   └── internal/
│       ├── api/               # Handlers, middleware, metrics
│       ├── drift/             # Drift computation engine
│       ├── models/            # Data structures
│       └── store/             # In-memory data store (10 seeded apps)
├── client/                    # Next.js frontend
│   └── src/
│       ├── api/               # API client
│       ├── components/        # React components
│       ├── pages/             # Next.js pages
│       ├── store/             # Redux slices
│       └── styles/            # Terminal-dark CSS
├── docs/                      # Documentation
├── k8s/                       # OpenShift manifests
├── Dockerfile                 # Multi-stage build
├── docker-compose.yml         # Local Docker
├── Jenkinsfile                # CI/CD pipeline
└── .gitignore
```

## License

Internal use only.
