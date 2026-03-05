# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenShift Cluster                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              gitops-controller (Pod)                      │   │
│  │                                                          │   │
│  │   ┌──────────────────┐    ┌───────────────────────┐     │   │
│  │   │   Go API Server   │    │   Static File Server  │     │   │
│  │   │   (port 8080)     │    │   (Next.js Export)     │     │   │
│  │   │                  │    │                       │     │   │
│  │   │  ┌────────────┐  │    │  React/Redux App      │     │   │
│  │   │  │  Handlers   │  │    │  ├─ AppsList          │     │   │
│  │   │  ├────────────┤  │    │  ├─ AppDetail          │     │   │
│  │   │  │  Store      │  │    │  ├─ ContextPanel      │     │   │
│  │   │  ├────────────┤  │    │  ├─ Modals             │     │   │
│  │   │  │  Drift Eng  │  │    │  └─ QuickFilters      │     │   │
│  │   │  ├────────────┤  │    └───────────────────────┘     │   │
│  │   │  │  Metrics    │  │                                  │   │
│  │   │  └────────────┘  │                                  │   │
│  │   └──────────────────┘                                  │   │
│  │                                                          │   │
│  └──────┬───────────────────────┬──────────────────────────┘   │
│         │                       │                               │
│    ┌────▼────┐           ┌─────▼──────┐                        │
│    │ Service  │           │   Route     │                        │
│    │ :8080    │           │  (TLS edge) │                        │
│    └─────────┘           └────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Language | Responsibility |
|-----------|----------|---------------|
| **Go API Server** | Go 1.18 | REST API, business logic, drift computation, audit logging |
| **Handlers** | Go | HTTP request handling, validation, response formatting |
| **Store** | Go | In-memory thread-safe data store (seeded with demo data) |
| **Drift Engine** | Go | Computes resource-level diffs between desired and live state |
| **Metrics** | Go | Prometheus metrics endpoint for observability |
| **Middleware** | Go | Request ID injection, structured JSON logging, CORS |
| **Frontend** | React/Redux | 3-pane terminal UI with keyboard navigation |
| **Redux Store** | JavaScript | State management for apps, detail, actions |

## Data Flow

```
User Action → React UI → Redux Dispatch → API Call → Go Handler
                                                        │
                                              ┌─────────┼─────────┐
                                              ▼         ▼         ▼
                                           Store    Drift Eng   Metrics
                                              │         │         │
                                              ▼         ▼         ▼
                                         Update    Compute    Record
                                         State     Diff       Counter
                                              │         │
                                              └────┬────┘
                                                   ▼
                                            JSON Response → Redux → UI Update
```

## API Flow Diagram

```
                   ┌──────────────────────────────┐
  GET /api/apps ──▶│  ListApps Handler            │
                   │  → Store.ListApps()           │
                   │  → Filter by env query param  │
                   │  → Return AppSummary[]         │
                   └──────────────────────────────┘

 POST /api/apps/  ┌──────────────────────────────┐
   {id}/sync ────▶│  SyncApp Handler             │
                  │  → Validate request           │
                  │  → Check freeze status        │
                  │  → Update env state           │
                  │  → Record release             │
                  │  → Add audit entry            │
                  │  → Emit Prometheus metric     │
                  │  → Return result              │
                  └──────────────────────────────┘
```

## Technology Stack

- **Backend**: Go 1.18, gorilla/mux, prometheus/client_golang
- **Frontend**: Next.js (Pages Router), React, Redux Toolkit
- **Styling**: Custom CSS (terminal-dark theme, monospace)
- **Container**: Multi-stage Docker (Alpine runtime)
- **CI/CD**: Jenkins Pipeline
- **Platform**: OpenShift / Kubernetes
- **Monitoring**: Prometheus metrics + structured JSON logs
