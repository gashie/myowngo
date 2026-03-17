package server

import (
	"goquest/internal/content"
	"goquest/internal/handler"
	"net/http"
)

// New creates the HTTP handler with all routes registered
func New(curriculum *content.Curriculum) http.Handler {
	mux := http.NewServeMux()

	pages := handler.NewPageHandler(curriculum, "web/templates")
	api := handler.NewAPIHandler(curriculum)

	// HTML pages
	mux.HandleFunc("GET /{$}", pages.Home)
	mux.HandleFunc("GET /lesson/{slug}", pages.Lesson)
	mux.HandleFunc("GET /dashboard", pages.Dashboard)

	// JSON API
	mux.HandleFunc("GET /api/lessons", api.ListLessons)
	mux.HandleFunc("GET /api/lessons/{slug}", api.GetLesson)
	mux.HandleFunc("GET /api/languages", api.ListLanguages)
	mux.HandleFunc("POST /api/run", api.RunCode)
	mux.HandleFunc("/api/run-local", api.RunCodeLocal)

	// Static files
	fs := http.FileServer(http.Dir("web/static"))
	mux.Handle("/static/", http.StripPrefix("/static/", fs))

	return applyMiddleware(mux)
}
