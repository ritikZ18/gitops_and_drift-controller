package models

import "time"

// SyncStatus represents the sync state of an application
type SyncStatus string

const (
	SyncStatusSynced    SyncStatus = "SYNCED"
	SyncStatusOutOfSync SyncStatus = "OUT_OF_SYNC"
	SyncStatusUnknown   SyncStatus = "UNKNOWN"
)

// HealthStatus represents the health of a rollout
type HealthStatus string

const (
	HealthStatusHealthy     HealthStatus = "HEALTHY"
	HealthStatusDegraded    HealthStatus = "DEGRADED"
	HealthStatusProgressing HealthStatus = "PROGRESSING"
	HealthStatusUnknown     HealthStatus = "UNKNOWN"
)

// DriftSeverity represents how severe drift is
type DriftSeverity string

const (
	DriftSeverityNone   DriftSeverity = "NONE"
	DriftSeverityLow    DriftSeverity = "LOW"
	DriftSeverityMedium DriftSeverity = "MEDIUM"
	DriftSeverityHigh   DriftSeverity = "HIGH"
)

// Environment represents a deployment target
type Environment struct {
	Name           string       `json:"name"`
	Namespace      string       `json:"namespace"`
	ClusterContext string       `json:"clusterContext"`
	DesiredRevision string      `json:"desiredRevision"`
	LiveRevision    string      `json:"liveRevision"`
	SyncStatus     SyncStatus   `json:"syncStatus"`
	HealthStatus   HealthStatus `json:"healthStatus"`
	DriftSeverity  DriftSeverity `json:"driftSeverity"`
	DriftCount     int          `json:"driftCount"`
	LastSyncTime   time.Time    `json:"lastSyncTime"`
	Frozen         bool         `json:"frozen"`
	FreezeReason   string       `json:"freezeReason,omitempty"`
}

// App represents a registered application
type App struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	RepoURL      string        `json:"repoUrl"`
	Path         string        `json:"path"`
	Owners       []string      `json:"owners"`
	Environments []Environment `json:"environments"`
	CreatedAt    time.Time     `json:"createdAt"`
}

// AppSummary is a compact view for the apps list
type AppSummary struct {
	ID             string        `json:"id"`
	Name           string        `json:"name"`
	Environment    string        `json:"environment"`
	SyncStatus     SyncStatus    `json:"syncStatus"`
	HealthStatus   HealthStatus  `json:"healthStatus"`
	DriftSeverity  DriftSeverity `json:"driftSeverity"`
	DriftCount     int           `json:"driftCount"`
	LastSyncTime   time.Time     `json:"lastSyncTime"`
	DesiredRevision string       `json:"desiredRevision"`
	LiveRevision    string       `json:"liveRevision"`
	Frozen         bool          `json:"frozen"`
}

// ReleaseRecord captures a release action
type ReleaseRecord struct {
	ID        string    `json:"id"`
	AppID     string    `json:"appId"`
	AppName   string    `json:"appName"`
	Env       string    `json:"env"`
	Revision  string    `json:"revision"`
	PrevRevision string `json:"prevRevision"`
	Action    string    `json:"action"` // sync, rollback
	Status    string    `json:"status"` // success, failed, in_progress
	Actor     string    `json:"actor"`
	Timestamp time.Time `json:"timestamp"`
	Message   string    `json:"message,omitempty"`
}

// AuditEntry captures an auditable action
type AuditEntry struct {
	RequestID string      `json:"requestId"`
	Actor     string      `json:"actor"`
	Action    string      `json:"action"`
	AppID     string      `json:"appId"`
	AppName   string      `json:"appName"`
	Env       string      `json:"env"`
	Payload   interface{} `json:"payload,omitempty"`
	Result    string      `json:"result"`
	Message   string      `json:"message,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// DriftResource is a single resource that has drifted
type DriftResource struct {
	Kind       string `json:"kind"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
	Field      string `json:"field"`
	DesiredVal string `json:"desiredValue"`
	LiveVal    string `json:"liveValue"`
	Severity   DriftSeverity `json:"severity"`
}

// DriftReport is the full drift analysis for an app/env
type DriftReport struct {
	AppID          string          `json:"appId"`
	Environment    string          `json:"environment"`
	Severity       DriftSeverity   `json:"severity"`
	ResourceCount  int             `json:"resourceCount"`
	Resources      []DriftResource `json:"resources"`
	Summary        string          `json:"summary"`
	TriageSteps    []string        `json:"triageSteps"`
	LastChecked    time.Time       `json:"lastChecked"`
}

// SyncRequest is the payload for promote/sync
type SyncRequest struct {
	Environment    string `json:"environment"`
	TargetRevision string `json:"targetRevision"`
	Reason         string `json:"reason,omitempty"`
	RequestID      string `json:"requestId"`
	Actor          string `json:"actor,omitempty"`
}

// RollbackRequest is the payload for rollback
type RollbackRequest struct {
	Environment    string `json:"environment"`
	TargetRevision string `json:"targetRevision"`
	Reason         string `json:"reason"`
	RequestID      string `json:"requestId"`
	Actor          string `json:"actor,omitempty"`
}

// FreezeRequest is the payload for freeze/unfreeze
type FreezeRequest struct {
	Environment string `json:"environment"`
	Freeze      bool   `json:"freeze"`
	Reason      string `json:"reason"`
	RequestID   string `json:"requestId"`
	Actor       string `json:"actor,omitempty"`
}

// ClusterEvent represents a cluster event
type ClusterEvent struct {
	Type      string    `json:"type"` // Normal, Warning
	Reason    string    `json:"reason"`
	Message   string    `json:"message"`
	Object    string    `json:"object"`
	Timestamp time.Time `json:"timestamp"`
}
