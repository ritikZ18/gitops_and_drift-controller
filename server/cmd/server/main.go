package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"github.com/swamizero/gitops-controller/internal/api"
	"github.com/swamizero/gitops-controller/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize store with seed data
	s := store.New()

	// Create router
	r := mux.NewRouter()

	// Apply middleware
	r.Use(api.RequestIDMiddleware)
	r.Use(api.LoggingMiddleware)

	// Register API routes
	handlers := api.NewHandlers(s)
	handlers.RegisterRoutes(r)

	// Serve static frontend (Next.js export)
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "./static"
	}
	if _, err := os.Stat(staticDir); err == nil {
		spa := spaHandler{staticPath: staticDir, indexPath: "index.html"}
		r.PathPrefix("/").Handler(spa)
		log.Printf("Serving static files from %s", staticDir)
	} else {
		log.Printf("No static directory found at %s, API-only mode", staticDir)
	}

	// CORS for development
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:8080"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "X-Request-ID", "Authorization"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	log.Printf(`{"level":"info","message":"GitOps Controller starting","port":"%s"}`, port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf(`{"level":"fatal","message":"server failed to start","error":"%v"}`, err)
	}
}

// spaHandler serves a single-page application
type spaHandler struct {
	staticPath string
	indexPath  string
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := h.staticPath + r.URL.Path

	// Check if file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		// Fallback to index.html for SPA routing
		http.ServeFile(w, r, h.staticPath+"/"+h.indexPath)
		return
	}

	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}
