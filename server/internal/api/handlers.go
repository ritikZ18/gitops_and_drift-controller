package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/swamizero/gitops-controller/internal/drift"
	"github.com/swamizero/gitops-controller/internal/models"
	"github.com/swamizero/gitops-controller/internal/store"
)

// Handlers holds API handler dependencies
type Handlers struct {
	Store *store.Store
}

// NewHandlers creates a new Handlers instance
func NewHandlers(s *store.Store) *Handlers {
	return &Handlers{Store: s}
}

// RegisterRoutes sets up all API routes
func (h *Handlers) RegisterRoutes(r *mux.Router) {
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/apps", h.ListApps).Methods("GET")
	api.HandleFunc("/apps", h.CreateApp).Methods("POST")
	api.HandleFunc("/apps/{id}", h.GetApp).Methods("GET")
	api.HandleFunc("/apps/{id}/drift", h.GetDrift).Methods("GET")
	api.HandleFunc("/apps/{id}/events", h.GetEvents).Methods("GET")
	api.HandleFunc("/apps/{id}/releases", h.GetReleases).Methods("GET")
	api.HandleFunc("/apps/{id}/sync", h.SyncApp).Methods("POST")
	api.HandleFunc("/apps/{id}/rollback", h.RollbackApp).Methods("POST")
	api.HandleFunc("/apps/{id}/freeze", h.FreezeApp).Methods("POST")
	api.HandleFunc("/audit", h.GetAudit).Methods("GET")

	r.HandleFunc("/healthz", h.Healthz).Methods("GET")
	r.Handle("/metrics", MetricsHandler()).Methods("GET")
}

// ListApps returns all apps with summary info
func (h *Handlers) ListApps(w http.ResponseWriter, r *http.Request) {
	apps := h.Store.ListApps()
	envFilter := r.URL.Query().Get("env")

	var summaries []models.AppSummary
	for _, app := range apps {
		for _, env := range app.Environments {
			if envFilter != "" && env.Name != envFilter {
				continue
			}
			summaries = append(summaries, models.AppSummary{
				ID:              app.ID,
				Name:            app.Name,
				Environment:     env.Name,
				SyncStatus:      env.SyncStatus,
				HealthStatus:    env.HealthStatus,
				DriftSeverity:   env.DriftSeverity,
				DriftCount:      env.DriftCount,
				LastSyncTime:    env.LastSyncTime,
				DesiredRevision: env.DesiredRevision,
				LiveRevision:    env.LiveRevision,
				Frozen:          env.Frozen,
			})
		}
	}

	respondJSON(w, http.StatusOK, summaries)
}

// GetApp returns detailed info for a single app
func (h *Handlers) GetApp(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	app, err := h.Store.GetApp(id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	// Include releases and recent audit
	releases := h.Store.GetReleases(id)
	auditEntries := h.Store.GetAudit(id, 20)
	events := h.Store.GetEvents(id)

	detail := map[string]interface{}{
		"app":      app,
		"releases": releases,
		"audit":    auditEntries,
		"events":   events,
	}

	respondJSON(w, http.StatusOK, detail)
}

// GetDrift returns drift analysis for an app
func (h *Handlers) GetDrift(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	envName := r.URL.Query().Get("env")
	if envName == "" {
		envName = "staging"
	}

	app, err := h.Store.GetApp(id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	report := drift.ComputeDrift(app, envName)
	driftTotal.WithLabelValues(string(report.Severity)).Inc()

	respondJSON(w, http.StatusOK, report)
}

// GetEvents returns cluster events for an app
func (h *Handlers) GetEvents(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	events := h.Store.GetEvents(id)
	if events == nil {
		events = []models.ClusterEvent{}
	}
	respondJSON(w, http.StatusOK, events)
}

// GetReleases returns release history for an app
func (h *Handlers) GetReleases(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	releases := h.Store.GetReleases(id)
	if releases == nil {
		releases = []models.ReleaseRecord{}
	}
	respondJSON(w, http.StatusOK, releases)
}

// SyncApp handles promote/sync action
func (h *Handlers) SyncApp(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	var req models.SyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RequestID == "" {
		req.RequestID = uuid.New().String()
	}
	if req.Actor == "" {
		req.Actor = "api-user"
	}
	if req.Environment == "" {
		req.Environment = "staging"
	}

	app, err := h.Store.GetApp(id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	// Check freeze
	env, err := h.Store.GetEnv(id, req.Environment)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	if env.Frozen {
		respondError(w, http.StatusConflict, fmt.Sprintf("app is frozen: %s", env.FreezeReason))
		return
	}

	start := time.Now()
	prevRevision := env.LiveRevision
	targetRevision := req.TargetRevision
	if targetRevision == "" {
		targetRevision = env.DesiredRevision
	}

	// Simulate sync
	h.Store.UpdateEnv(id, req.Environment, func(e *models.Environment) {
		e.LiveRevision = targetRevision
		e.SyncStatus = models.SyncStatusSynced
		e.HealthStatus = models.HealthStatusHealthy
		e.DriftSeverity = models.DriftSeverityNone
		e.DriftCount = 0
		e.LastSyncTime = time.Now()
	})

	duration := time.Since(start).Seconds()
	rolloutDuration.WithLabelValues("sync").Observe(duration)
	syncTotal.WithLabelValues("success").Inc()

	release := models.ReleaseRecord{
		ID:           uuid.New().String(),
		AppID:        id,
		AppName:      app.Name,
		Env:          req.Environment,
		Revision:     targetRevision,
		PrevRevision: prevRevision,
		Action:       "sync",
		Status:       "success",
		Actor:        req.Actor,
		Timestamp:    time.Now(),
		Message:      req.Reason,
	}
	h.Store.AddRelease(release)

	h.Store.AddAudit(models.AuditEntry{
		RequestID: req.RequestID,
		Actor:     req.Actor,
		Action:    "sync",
		AppID:     id,
		AppName:   app.Name,
		Env:       req.Environment,
		Payload:   req,
		Result:    "success",
		Message:   fmt.Sprintf("Synced to revision %s", targetRevision),
		Timestamp: time.Now(),
	})

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "success",
		"requestId": req.RequestID,
		"revision":  targetRevision,
		"message":   fmt.Sprintf("Successfully synced %s/%s to %s", app.Name, req.Environment, targetRevision),
	})
}

// RollbackApp handles rollback action
func (h *Handlers) RollbackApp(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	var req models.RollbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RequestID == "" {
		req.RequestID = uuid.New().String()
	}
	if req.Actor == "" {
		req.Actor = "api-user"
	}
	if req.Environment == "" {
		req.Environment = "staging"
	}
	if req.TargetRevision == "" {
		respondError(w, http.StatusBadRequest, "targetRevision is required")
		return
	}

	app, err := h.Store.GetApp(id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	env, err := h.Store.GetEnv(id, req.Environment)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	if env.Frozen {
		respondError(w, http.StatusConflict, fmt.Sprintf("app is frozen: %s", env.FreezeReason))
		return
	}

	start := time.Now()
	prevRevision := env.LiveRevision

	h.Store.UpdateEnv(id, req.Environment, func(e *models.Environment) {
		e.LiveRevision = req.TargetRevision
		e.DesiredRevision = req.TargetRevision
		e.SyncStatus = models.SyncStatusSynced
		e.HealthStatus = models.HealthStatusProgressing
		e.DriftSeverity = models.DriftSeverityNone
		e.DriftCount = 0
		e.LastSyncTime = time.Now()
	})

	duration := time.Since(start).Seconds()
	rolloutDuration.WithLabelValues("rollback").Observe(duration)
	syncTotal.WithLabelValues("success").Inc()

	release := models.ReleaseRecord{
		ID:           uuid.New().String(),
		AppID:        id,
		AppName:      app.Name,
		Env:          req.Environment,
		Revision:     req.TargetRevision,
		PrevRevision: prevRevision,
		Action:       "rollback",
		Status:       "success",
		Actor:        req.Actor,
		Timestamp:    time.Now(),
		Message:      req.Reason,
	}
	h.Store.AddRelease(release)

	h.Store.AddAudit(models.AuditEntry{
		RequestID: req.RequestID,
		Actor:     req.Actor,
		Action:    "rollback",
		AppID:     id,
		AppName:   app.Name,
		Env:       req.Environment,
		Payload:   req,
		Result:    "success",
		Message:   fmt.Sprintf("Rolled back from %s to %s: %s", prevRevision, req.TargetRevision, req.Reason),
		Timestamp: time.Now(),
	})

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"status":       "success",
		"requestId":    req.RequestID,
		"revision":     req.TargetRevision,
		"prevRevision": prevRevision,
		"message":      fmt.Sprintf("Successfully rolled back %s/%s to %s", app.Name, req.Environment, req.TargetRevision),
	})
}

// FreezeApp handles freeze/unfreeze action
func (h *Handlers) FreezeApp(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	var req models.FreezeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RequestID == "" {
		req.RequestID = uuid.New().String()
	}
	if req.Actor == "" {
		req.Actor = "api-user"
	}
	if req.Environment == "" {
		req.Environment = "staging"
	}

	app, err := h.Store.GetApp(id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	action := "freeze"
	if !req.Freeze {
		action = "unfreeze"
	}

	err = h.Store.UpdateEnv(id, req.Environment, func(e *models.Environment) {
		e.Frozen = req.Freeze
		if req.Freeze {
			e.FreezeReason = req.Reason
		} else {
			e.FreezeReason = ""
		}
	})
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	h.Store.AddAudit(models.AuditEntry{
		RequestID: req.RequestID,
		Actor:     req.Actor,
		Action:    action,
		AppID:     id,
		AppName:   app.Name,
		Env:       req.Environment,
		Payload:   req,
		Result:    "success",
		Message:   fmt.Sprintf("%s %s/%s: %s", strings.Title(action), app.Name, req.Environment, req.Reason),
		Timestamp: time.Now(),
	})

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "success",
		"requestId": req.RequestID,
		"action":    action,
		"message":   fmt.Sprintf("Successfully %sd %s/%s", action, app.Name, req.Environment),
	})
}

// GetAudit returns audit log entries
func (h *Handlers) GetAudit(w http.ResponseWriter, r *http.Request) {
	appID := r.URL.Query().Get("appId")
	entries := h.Store.GetAudit(appID, 100)
	if entries == nil {
		entries = []models.AuditEntry{}
	}
	respondJSON(w, http.StatusOK, entries)
}

// Healthz is the liveness/readiness probe endpoint
func (h *Handlers) Healthz(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("ERROR: failed to encode response: %v", err)
	}
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// CreateApp registers a new application
func (h *Handlers) CreateApp(w http.ResponseWriter, r *http.Request) {
	var req models.CreateAppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" || req.RepoURL == "" {
		respondError(w, http.StatusBadRequest, "name and repoUrl are required")
		return
	}

	appID := "app-" + uuid.New().String()[:8]
	now := time.Now()

	newApp := models.App{
		ID:        appID,
		Name:      req.Name,
		RepoURL:   req.RepoURL,
		Path:      req.ManifestsPath,
		Owners:    []string{req.Owner},
		CreatedAt: now,
		Environments: []models.Environment{
			{
				Name:            "staging",
				Namespace:       req.Name + "-staging",
				ClusterContext:  "prod-us1",
				DesiredRevision: req.DefaultBranch,
				LiveRevision:    "initial",
				SyncStatus:      models.SyncStatusOutOfSync,
				HealthStatus:    models.HealthStatusUnknown,
				DriftSeverity:   models.DriftSeverityNone,
				DriftCount:      0,
				LastSyncTime:    now,
			},
			{
				Name:            "production",
				Namespace:       req.Name + "-prod",
				ClusterContext:  "prod-us1",
				DesiredRevision: req.DefaultBranch,
				LiveRevision:    "initial",
				SyncStatus:      models.SyncStatusOutOfSync,
				HealthStatus:    models.HealthStatusUnknown,
				DriftSeverity:   models.DriftSeverityNone,
				DriftCount:      0,
				LastSyncTime:    now,
			},
		},
	}

	if newApp.Path == "" {
		newApp.Path = "k8s/"
	}
	if req.Owner == "" {
		newApp.Owners = []string{"platform-team"}
	}
	if req.DefaultBranch == "" {
		newApp.Environments[0].DesiredRevision = "main"
		newApp.Environments[1].DesiredRevision = "main"
	}

	h.Store.AddApp(newApp)

	if req.FetchHistory {
		// Seed some mock history for the new app
		mockReleases := []models.ReleaseRecord{
			{ID: uuid.New().String(), AppID: appID, AppName: req.Name, Env: "staging", Revision: "f00b001", PrevRevision: "f00b000", Action: "sync", Status: "success", Actor: req.Owner, Timestamp: now.Add(-24 * time.Hour), Message: "Initial production baseline"},
			{ID: uuid.New().String(), AppID: appID, AppName: req.Name, Env: "staging", Revision: "f00b002", PrevRevision: "f00b001", Action: "sync", Status: "success", Actor: req.Owner, Timestamp: now.Add(-12 * time.Hour), Message: "Update manifests for resource limits"},
			{ID: uuid.New().String(), AppID: appID, AppName: req.Name, Env: "staging", Revision: "f00b003", PrevRevision: "f00b002", Action: "sync", Status: "success", Actor: req.Owner, Timestamp: now.Add(-1 * time.Hour), Message: "Add health check probes"},
		}
		for _, r := range mockReleases {
			h.Store.AddRelease(r)
		}

		// Seed some mock events
		mockEvents := []models.ClusterEvent{
			{Type: "Normal", Reason: "Created", Message: "Created pod group", Object: "Deployment/" + req.Name, Timestamp: now.Add(-1 * time.Hour)},
			{Type: "Normal", Reason: "ScalingReplicaSet", Message: "Scaled up replica set", Object: "ReplicaSet/" + req.Name + "-5f7d", Timestamp: now.Add(-55 * time.Minute)},
		}
		for _, e := range mockEvents {
			h.Store.AddEvent(appID, e)
		}
	}

	h.Store.AddAudit(models.AuditEntry{
		RequestID: uuid.New().String(),
		Actor:     req.Owner,
		Action:    "create_app",
		AppID:     appID,
		AppName:   req.Name,
		Payload:   req,
		Result:    "success",
		Message:   fmt.Sprintf("Registered new app: %s", req.Name),
		Timestamp: now,
	})

	respondJSON(w, http.StatusCreated, newApp)
}
