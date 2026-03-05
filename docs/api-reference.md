# API Reference

## Base URL

```
http://localhost:8080/api
```

## Endpoints

### List Applications

```
GET /api/apps
GET /api/apps?env=staging
```

**Query Parameters:**
| Param | Type   | Description |
|-------|--------|-------------|
| env   | string | Filter by environment name (staging, production) |

**Response:** `200 OK`
```json
[
  {
    "id": "app-001",
    "name": "payments-api",
    "environment": "staging",
    "syncStatus": "OUT_OF_SYNC",
    "healthStatus": "DEGRADED",
    "driftSeverity": "HIGH",
    "driftCount": 12,
    "lastSyncTime": "2024-01-15T10:30:00Z",
    "desiredRevision": "a1b2c3d",
    "liveRevision": "z9y8x7w",
    "frozen": false
  }
]
```

---

### Get Application Detail

```
GET /api/apps/{id}
```

**Response:** `200 OK`
```json
{
  "app": {
    "id": "app-001",
    "name": "payments-api",
    "repoUrl": "github.com/acme/payments-api",
    "path": "k8s/overlays",
    "owners": ["platform-team", "payments-team"],
    "environments": [...],
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "releases": [...],
  "audit": [...],
  "events": [...]
}
```

---

### Get Drift Report

```
GET /api/apps/{id}/drift?env=staging
```

**Query Parameters:**
| Param | Type   | Default | Description |
|-------|--------|---------|-------------|
| env   | string | staging | Environment to analyze |

**Response:** `200 OK`
```json
{
  "appId": "app-001",
  "environment": "staging",
  "severity": "HIGH",
  "resourceCount": 12,
  "resources": [
    {
      "kind": "Deployment",
      "name": "payments-api",
      "namespace": "payments-staging",
      "field": "spec.replicas",
      "desiredValue": "3",
      "liveValue": "1",
      "severity": "HIGH"
    }
  ],
  "summary": "12 resources drifted...",
  "triageSteps": ["Check if manual kubectl edit was used..."],
  "lastChecked": "2024-01-15T10:35:00Z"
}
```

---

### Get Cluster Events

```
GET /api/apps/{id}/events
```

**Response:** `200 OK`
```json
[
  {
    "type": "Warning",
    "reason": "ImagePullBackOff",
    "message": "Back-off pulling image...",
    "object": "pod/payments-api-7f8d9c-x2k4l",
    "timestamp": "2024-01-15T10:29:00Z"
  }
]
```

---

### Get Release History

```
GET /api/apps/{id}/releases
```

**Response:** `200 OK`
```json
[
  {
    "id": "rel-001",
    "appId": "app-001",
    "appName": "payments-api",
    "env": "staging",
    "revision": "a1b2c3d",
    "prevRevision": "z9y8x7w",
    "action": "sync",
    "status": "failed",
    "actor": "ritik",
    "timestamp": "2024-01-15T10:18:00Z",
    "message": "ImagePullBackOff..."
  }
]
```

---

### Promote / Sync

```
POST /api/apps/{id}/sync
Content-Type: application/json
```

**Request Body:**
```json
{
  "environment": "staging",
  "targetRevision": "a1b2c3d",
  "reason": "deploy new feature",
  "requestId": "uuid",
  "actor": "ritik"
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "requestId": "uuid",
  "revision": "a1b2c3d",
  "message": "Successfully synced payments-api/staging to a1b2c3d"
}
```

**Error (frozen):** `409 Conflict`
```json
{ "error": "app is frozen: Incident INC-4421" }
```

---

### Rollback

```
POST /api/apps/{id}/rollback
Content-Type: application/json
```

**Request Body:**
```json
{
  "environment": "staging",
  "targetRevision": "z9y8x7w",
  "reason": "rollback due to failed rollout",
  "requestId": "uuid",
  "actor": "ritik"
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "requestId": "uuid",
  "revision": "z9y8x7w",
  "prevRevision": "a1b2c3d",
  "message": "Successfully rolled back payments-api/staging to z9y8x7w"
}
```

---

### Freeze / Unfreeze

```
POST /api/apps/{id}/freeze
Content-Type: application/json
```

**Request Body:**
```json
{
  "environment": "staging",
  "freeze": true,
  "reason": "Incident INC-4421: investigating upstream latency",
  "requestId": "uuid",
  "actor": "ritik"
}
```

---

### Audit Log

```
GET /api/audit
GET /api/audit?appId=app-001
```

---

### Health Check

```
GET /healthz
```

**Response:** `200 OK`
```json
{ "status": "ok", "time": "2024-01-15T10:35:00Z" }
```

---

### Prometheus Metrics

```
GET /metrics
```

Returns Prometheus-format metrics:
- `gitops_sync_total{status=success|fail}`
- `gitops_drift_total{severity=low|med|high}`
- `gitops_rollout_duration_seconds`
- `gitops_cluster_api_errors_total`
- `gitops_http_requests_total`
- `gitops_http_request_duration_seconds`
