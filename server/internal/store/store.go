package store

import (
	"fmt"
	"sync"
	"time"

	"github.com/swamizero/gitops-controller/internal/models"
)

// Store is a thread-safe in-memory data store
type Store struct {
	mu       sync.RWMutex
	apps     map[string]*models.App
	releases []models.ReleaseRecord
	audit    []models.AuditEntry
	events   map[string][]models.ClusterEvent // keyed by appID
}

// New creates a store seeded with realistic demo data
func New() *Store {
	s := &Store{
		apps:     make(map[string]*models.App),
		releases: []models.ReleaseRecord{},
		audit:    []models.AuditEntry{},
		events:   make(map[string][]models.ClusterEvent),
	}
	s.seed()
	return s
}

func (s *Store) seed() {
	now := time.Now()

	apps := []models.App{
		{
			ID: "app-001", Name: "payments-api", RepoURL: "github.com/acme/payments-api",
			Path: "k8s/overlays", Owners: []string{"platform-team", "payments-team"},
			Environments: []models.Environment{
				{Name: "staging", Namespace: "payments-staging", ClusterContext: "prod-us1", DesiredRevision: "a1b2c3d", LiveRevision: "z9y8x7w", SyncStatus: models.SyncStatusOutOfSync, HealthStatus: models.HealthStatusDegraded, DriftSeverity: models.DriftSeverityHigh, DriftCount: 12, LastSyncTime: now.Add(-12 * time.Minute)},
				{Name: "production", Namespace: "payments-prod", ClusterContext: "prod-us1", DesiredRevision: "e4f5g6h", LiveRevision: "e4f5g6h", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-2 * time.Hour)},
			},
			CreatedAt: now.Add(-90 * 24 * time.Hour),
		},
		{
			ID: "app-002", Name: "orders-api", RepoURL: "github.com/acme/orders-api",
			Path: "deploy/", Owners: []string{"orders-team"},
			Environments: []models.Environment{
				{Name: "staging", Namespace: "orders-staging", ClusterContext: "prod-us1", DesiredRevision: "b2c3d4e", LiveRevision: "b2c3d4e", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityLow, DriftCount: 2, LastSyncTime: now.Add(-5 * time.Minute)},
				{Name: "production", Namespace: "orders-prod", ClusterContext: "prod-us1", DesiredRevision: "f6g7h8i", LiveRevision: "c3d4e5f", SyncStatus: models.SyncStatusOutOfSync, HealthStatus: models.HealthStatusProgressing, DriftSeverity: models.DriftSeverityMedium, DriftCount: 5, LastSyncTime: now.Add(-45 * time.Minute)},
			},
			CreatedAt: now.Add(-60 * 24 * time.Hour),
		},
		{
			ID: "app-003", Name: "auth-service", RepoURL: "github.com/acme/auth-service",
			Path: "charts/auth", Owners: []string{"security-team"},
			Environments: []models.Environment{
				{Name: "staging", Namespace: "auth-staging", ClusterContext: "prod-us1", DesiredRevision: "d4e5f6g", LiveRevision: "d4e5f6g", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-1 * time.Minute)},
				{Name: "production", Namespace: "auth-prod", ClusterContext: "prod-us1", DesiredRevision: "d4e5f6g", LiveRevision: "d4e5f6g", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-3 * time.Hour)},
			},
			CreatedAt: now.Add(-120 * 24 * time.Hour),
		},
		{
			ID: "app-004", Name: "notification-svc", RepoURL: "github.com/acme/notification-svc",
			Path: "k8s/", Owners: []string{"platform-team"},
			Environments: []models.Environment{
				{Name: "staging", Namespace: "notif-staging", ClusterContext: "prod-us1", DesiredRevision: "h8i9j0k", LiveRevision: "g7h8i9j", SyncStatus: models.SyncStatusOutOfSync, HealthStatus: models.HealthStatusProgressing, DriftSeverity: models.DriftSeverityMedium, DriftCount: 4, LastSyncTime: now.Add(-8 * time.Minute)},
				{Name: "production", Namespace: "notif-prod", ClusterContext: "prod-us1", DesiredRevision: "f6g7h8i", LiveRevision: "f6g7h8i", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-6 * time.Hour)},
			},
			CreatedAt: now.Add(-30 * 24 * time.Hour),
		},
		{
			ID: "app-005", Name: "inventory-mgr", RepoURL: "github.com/acme/inventory-mgr",
			Path: "manifests/", Owners: []string{"warehouse-team"},
			Environments: []models.Environment{
				{Name: "staging", Namespace: "inv-staging", ClusterContext: "prod-us1", DesiredRevision: "k1l2m3n", LiveRevision: "k1l2m3n", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-20 * time.Minute)},
				{Name: "production", Namespace: "inv-prod", ClusterContext: "prod-us1", DesiredRevision: "j0k1l2m", LiveRevision: "j0k1l2m", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-1 * time.Hour)},
			},
			CreatedAt: now.Add(-45 * 24 * time.Hour),
		},
		{
			ID: "app-006", Name: "search-engine", RepoURL: "github.com/acme/search-engine",
			Path: "deploy/k8s", Owners: []string{"search-team", "platform-team"},
			Environments: []models.Environment{
				{Name: "staging", Namespace: "search-staging", ClusterContext: "prod-us1", DesiredRevision: "n4o5p6q", LiveRevision: "m3n4o5p", SyncStatus: models.SyncStatusOutOfSync, HealthStatus: models.HealthStatusDegraded, DriftSeverity: models.DriftSeverityHigh, DriftCount: 8, LastSyncTime: now.Add(-35 * time.Minute)},
				{Name: "production", Namespace: "search-prod", ClusterContext: "prod-us1", DesiredRevision: "l2m3n4o", LiveRevision: "l2m3n4o", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityLow, DriftCount: 1, LastSyncTime: now.Add(-4 * time.Hour)},
			},
			CreatedAt: now.Add(-75 * 24 * time.Hour),
		},
		{
			ID: "app-007", Name: "user-profile-api", RepoURL: "github.com/acme/user-profile-api",
			Path: "k8s/base", Owners: []string{"identity-team"},
			Environments: []models.Environment{
				{Name: "staging", Namespace: "profile-staging", ClusterContext: "prod-us1", DesiredRevision: "q7r8s9t", LiveRevision: "q7r8s9t", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-3 * time.Minute)},
				{Name: "production", Namespace: "profile-prod", ClusterContext: "prod-us1", DesiredRevision: "p6q7r8s", LiveRevision: "p6q7r8s", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-30 * time.Minute)},
			},
			CreatedAt: now.Add(-50 * 24 * time.Hour),
		},
		{
			ID: "app-008", Name: "analytics-pipeline", RepoURL: "github.com/acme/analytics-pipeline",
			Path: "infra/k8s", Owners: []string{"data-team"},
			Environments: []models.Environment{
				{Name: "staging", Namespace: "analytics-staging", ClusterContext: "prod-us1", DesiredRevision: "t0u1v2w", LiveRevision: "s9t0u1v", SyncStatus: models.SyncStatusOutOfSync, HealthStatus: models.HealthStatusProgressing, DriftSeverity: models.DriftSeverityMedium, DriftCount: 6, LastSyncTime: now.Add(-15 * time.Minute)},
				{Name: "production", Namespace: "analytics-prod", ClusterContext: "prod-us1", DesiredRevision: "r8s9t0u", LiveRevision: "r8s9t0u", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-5 * time.Hour)},
			},
			CreatedAt: now.Add(-100 * 24 * time.Hour),
		},
		{
			ID: "app-009", Name: "gateway-proxy", RepoURL: "github.com/acme/gateway-proxy",
			Path: "deploy/", Owners: []string{"platform-team", "networking-team"},
			Environments: []models.Environment{
				{Name: "staging", Namespace: "gateway-staging", ClusterContext: "prod-us1", DesiredRevision: "w3x4y5z", LiveRevision: "w3x4y5z", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-7 * time.Minute), Frozen: true, FreezeReason: "Incident INC-4421: investigating upstream latency"},
				{Name: "production", Namespace: "gateway-prod", ClusterContext: "prod-us1", DesiredRevision: "v2w3x4y", LiveRevision: "v2w3x4y", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-2 * time.Hour), Frozen: true, FreezeReason: "Incident INC-4421: investigating upstream latency"},
			},
			CreatedAt: now.Add(-200 * 24 * time.Hour),
		},
		{
			ID: "app-010", Name: "billing-service", RepoURL: "github.com/acme/billing-service",
			Path: "k8s/overlays", Owners: []string{"billing-team", "finance-team"},
			Environments: []models.Environment{
				{Name: "staging", Namespace: "billing-staging", ClusterContext: "prod-us1", DesiredRevision: "z6a7b8c", LiveRevision: "y5z6a7b", SyncStatus: models.SyncStatusOutOfSync, HealthStatus: models.HealthStatusDegraded, DriftSeverity: models.DriftSeverityHigh, DriftCount: 15, LastSyncTime: now.Add(-42 * time.Minute)},
				{Name: "production", Namespace: "billing-prod", ClusterContext: "prod-us1", DesiredRevision: "x4y5z6a", LiveRevision: "x4y5z6a", SyncStatus: models.SyncStatusSynced, HealthStatus: models.HealthStatusHealthy, DriftSeverity: models.DriftSeverityNone, DriftCount: 0, LastSyncTime: now.Add(-8 * time.Hour)},
			},
			CreatedAt: now.Add(-150 * 24 * time.Hour),
		},
	}

	for i := range apps {
		s.apps[apps[i].ID] = &apps[i]
	}

	// Seed some release history
	releases := []models.ReleaseRecord{
		{ID: "rel-001", AppID: "app-001", AppName: "payments-api", Env: "staging", Revision: "a1b2c3d", PrevRevision: "z9y8x7w", Action: "sync", Status: "failed", Actor: "ritik", Timestamp: now.Add(-12 * time.Minute), Message: "ImagePullBackOff: registry.acme.io/payments:a1b2c3d"},
		{ID: "rel-002", AppID: "app-001", AppName: "payments-api", Env: "production", Revision: "e4f5g6h", PrevRevision: "d3e4f5g", Action: "sync", Status: "success", Actor: "ritik", Timestamp: now.Add(-2 * time.Hour)},
		{ID: "rel-003", AppID: "app-002", AppName: "orders-api", Env: "staging", Revision: "b2c3d4e", PrevRevision: "a1b2c3d", Action: "sync", Status: "success", Actor: "priya", Timestamp: now.Add(-5 * time.Minute)},
		{ID: "rel-004", AppID: "app-002", AppName: "orders-api", Env: "production", Revision: "f6g7h8i", PrevRevision: "e5f6g7h", Action: "sync", Status: "in_progress", Actor: "deploy-bot", Timestamp: now.Add(-45 * time.Minute)},
		{ID: "rel-005", AppID: "app-006", AppName: "search-engine", Env: "staging", Revision: "n4o5p6q", PrevRevision: "m3n4o5p", Action: "sync", Status: "failed", Actor: "alex", Timestamp: now.Add(-35 * time.Minute), Message: "CrashLoopBackOff: OOMKilled"},
		{ID: "rel-006", AppID: "app-010", AppName: "billing-service", Env: "staging", Revision: "z6a7b8c", PrevRevision: "y5z6a7b", Action: "sync", Status: "failed", Actor: "maya", Timestamp: now.Add(-42 * time.Minute), Message: "Readiness probe failed: connection refused on :8080"},
		{ID: "rel-007", AppID: "app-009", AppName: "gateway-proxy", Env: "staging", Revision: "w3x4y5z", PrevRevision: "v2w3x4y", Action: "sync", Status: "success", Actor: "ritik", Timestamp: now.Add(-1 * time.Hour)},
		{ID: "rel-008", AppID: "app-003", AppName: "auth-service", Env: "staging", Revision: "d4e5f6g", PrevRevision: "c3d4e5f", Action: "rollback", Status: "success", Actor: "security-bot", Timestamp: now.Add(-3 * time.Hour), Message: "Rollback after CVE-2024-1234 patch caused auth failures"},
	}
	s.releases = releases

	// Seed audit entries
	for _, r := range releases {
		s.audit = append(s.audit, models.AuditEntry{
			RequestID: "req-" + r.ID,
			Actor:     r.Actor,
			Action:    r.Action,
			AppID:     r.AppID,
			AppName:   r.AppName,
			Env:       r.Env,
			Result:    r.Status,
			Message:   r.Message,
			Timestamp: r.Timestamp,
		})
	}

	// Seed freeze audit
	s.audit = append(s.audit, models.AuditEntry{
		RequestID: "req-freeze-001",
		Actor:     "ritik",
		Action:    "freeze",
		AppID:     "app-009",
		AppName:   "gateway-proxy",
		Env:       "staging",
		Result:    "success",
		Message:   "Incident INC-4421: investigating upstream latency",
		Timestamp: now.Add(-30 * time.Minute),
	})

	// Seed cluster events
	s.events["app-001"] = []models.ClusterEvent{
		{Type: "Warning", Reason: "ImagePullBackOff", Message: "Back-off pulling image \"registry.acme.io/payments:a1b2c3d\"", Object: "pod/payments-api-7f8d9c-x2k4l", Timestamp: now.Add(-11 * time.Minute)},
		{Type: "Warning", Reason: "Failed", Message: "Error: ImagePullBackOff", Object: "pod/payments-api-7f8d9c-x2k4l", Timestamp: now.Add(-10 * time.Minute)},
		{Type: "Normal", Reason: "Scheduled", Message: "Successfully assigned payments-staging/payments-api-7f8d9c-x2k4l to node-3", Object: "pod/payments-api-7f8d9c-x2k4l", Timestamp: now.Add(-12 * time.Minute)},
	}
	s.events["app-006"] = []models.ClusterEvent{
		{Type: "Warning", Reason: "OOMKilled", Message: "Container search-engine exceeded memory limit (512Mi)", Object: "pod/search-engine-5c6d7e-m9n0p", Timestamp: now.Add(-34 * time.Minute)},
		{Type: "Warning", Reason: "CrashLoopBackOff", Message: "Back-off restarting failed container", Object: "pod/search-engine-5c6d7e-m9n0p", Timestamp: now.Add(-33 * time.Minute)},
		{Type: "Normal", Reason: "Pulling", Message: "Pulling image \"registry.acme.io/search:n4o5p6q\"", Object: "pod/search-engine-5c6d7e-m9n0p", Timestamp: now.Add(-36 * time.Minute)},
	}
	s.events["app-010"] = []models.ClusterEvent{
		{Type: "Warning", Reason: "Unhealthy", Message: "Readiness probe failed: connection refused on :8080", Object: "pod/billing-service-8a9b0c-q1r2s", Timestamp: now.Add(-41 * time.Minute)},
		{Type: "Normal", Reason: "Started", Message: "Started container billing-service", Object: "pod/billing-service-8a9b0c-q1r2s", Timestamp: now.Add(-42 * time.Minute)},
	}
	s.events["app-002"] = []models.ClusterEvent{
		{Type: "Normal", Reason: "ScalingReplicaSet", Message: "Scaled up replica set orders-api-6d7e8f to 3", Object: "deployment/orders-api", Timestamp: now.Add(-44 * time.Minute)},
		{Type: "Normal", Reason: "Pulling", Message: "Pulling image \"registry.acme.io/orders:f6g7h8i\"", Object: "pod/orders-api-6d7e8f-t3u4v", Timestamp: now.Add(-44 * time.Minute)},
	}
}

// ListApps returns all apps
func (s *Store) ListApps() []*models.App {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*models.App, 0, len(s.apps))
	for _, a := range s.apps {
		result = append(result, a)
	}
	return result
}

// GetApp returns a single app by ID
func (s *Store) GetApp(id string) (*models.App, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	app, ok := s.apps[id]
	if !ok {
		return nil, fmt.Errorf("app not found: %s", id)
	}
	return app, nil
}

// GetEnv returns a specific environment for an app
func (s *Store) GetEnv(appID, envName string) (*models.Environment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	app, ok := s.apps[appID]
	if !ok {
		return nil, fmt.Errorf("app not found: %s", appID)
	}
	for i := range app.Environments {
		if app.Environments[i].Name == envName {
			return &app.Environments[i], nil
		}
	}
	return nil, fmt.Errorf("environment not found: %s/%s", appID, envName)
}

// UpdateEnv updates an environment for an app
func (s *Store) UpdateEnv(appID, envName string, updater func(*models.Environment)) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	app, ok := s.apps[appID]
	if !ok {
		return fmt.Errorf("app not found: %s", appID)
	}
	for i := range app.Environments {
		if app.Environments[i].Name == envName {
			updater(&app.Environments[i])
			return nil
		}
	}
	return fmt.Errorf("environment not found: %s/%s", appID, envName)
}

// AddRelease adds a release record
func (s *Store) AddRelease(r models.ReleaseRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.releases = append([]models.ReleaseRecord{r}, s.releases...)
}

// GetReleases returns releases, optionally filtered by app
func (s *Store) GetReleases(appID string) []models.ReleaseRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if appID == "" {
		return s.releases
	}
	var result []models.ReleaseRecord
	for _, r := range s.releases {
		if r.AppID == appID {
			result = append(result, r)
		}
	}
	return result
}

// AddAudit adds an audit entry
func (s *Store) AddAudit(e models.AuditEntry) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.audit = append([]models.AuditEntry{e}, s.audit...)
}

// GetAudit returns audit entries, optionally filtered
func (s *Store) GetAudit(appID string, limit int) []models.AuditEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []models.AuditEntry
	for _, e := range s.audit {
		if appID != "" && e.AppID != appID {
			continue
		}
		result = append(result, e)
		if limit > 0 && len(result) >= limit {
			break
		}
	}
	return result
}

// GetEvents returns cluster events for an app
func (s *Store) GetEvents(appID string) []models.ClusterEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.events[appID]
}
