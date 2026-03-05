package api

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	syncTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "gitops_sync_total",
		Help: "Total number of sync operations",
	}, []string{"status"})

	driftTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "gitops_drift_total",
		Help: "Total number of drift detections",
	}, []string{"severity"})

	rolloutDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "gitops_rollout_duration_seconds",
		Help:    "Duration of rollout operations",
		Buckets: prometheus.DefBuckets,
	}, []string{"action"})

	clusterAPIErrors = promauto.NewCounter(prometheus.CounterOpts{
		Name: "gitops_cluster_api_errors_total",
		Help: "Total number of cluster API errors",
	})

	httpRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "gitops_http_requests_total",
		Help: "Total HTTP requests",
	}, []string{"method", "path", "status"})

	httpRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "gitops_http_request_duration_seconds",
		Help:    "HTTP request duration",
		Buckets: prometheus.DefBuckets,
	}, []string{"method", "path"})
)

// MetricsHandler returns the Prometheus metrics handler
func MetricsHandler() http.Handler {
	return promhttp.Handler()
}
