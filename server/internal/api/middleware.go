package api

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// RequestIDMiddleware injects a unique request ID into each request
func RequestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = uuid.New().String()
		}
		w.Header().Set("X-Request-ID", reqID)
		r.Header.Set("X-Request-ID", reqID)
		next.ServeHTTP(w, r)
	})
}

// LoggingMiddleware logs each request in structured JSON format
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(sw, r)
		duration := time.Since(start)

		log.Printf(`{"level":"info","method":"%s","path":"%s","status":%d,"duration":"%s","requestId":"%s","remoteAddr":"%s"}`,
			r.Method, r.URL.Path, sw.statusCode, duration, r.Header.Get("X-Request-ID"), r.RemoteAddr)

		httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, fmt.Sprintf("%d", sw.statusCode)).Inc()
		httpRequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration.Seconds())
	})
}

type statusWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *statusWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}
