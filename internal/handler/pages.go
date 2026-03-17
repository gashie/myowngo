package handler

import (
	"encoding/json"
	"goquest/internal/content"
	"html/template"
	"log"
	"net/http"
	"path/filepath"
	"strings"
)

// PageHandler serves HTML pages
type PageHandler struct {
	curriculum *content.Curriculum
	templates  *template.Template
}

// NewPageHandler creates a page handler with parsed templates
func NewPageHandler(c *content.Curriculum, tmplDir string) *PageHandler {
	funcMap := template.FuncMap{
		"lower": strings.ToLower,
		"json": func(v interface{}) template.JS {
			b, _ := json.Marshal(v)
			return template.JS(b)
		},
		"add": func(a, b int) int { return a + b },
	}

	tmpl := template.Must(
		template.New("").Funcs(funcMap).ParseGlob(filepath.Join(tmplDir, "*.html")),
	)
	// Parse partials too
	template.Must(
		tmpl.ParseGlob(filepath.Join(tmplDir, "partials", "*.html")),
	)

	return &PageHandler{curriculum: c, templates: tmpl}
}

// Home renders the quest map
func (h *PageHandler) Home(w http.ResponseWriter, r *http.Request) {
	err := h.templates.ExecuteTemplate(w, "home.html", map[string]interface{}{
		"Phases":    h.curriculum.Phases,
		"Languages": content.SupportedLanguages,
	})
	if err != nil {
		log.Printf("template error: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

// Lesson renders a single lesson page
func (h *PageHandler) Lesson(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	lesson := h.curriculum.FindLesson(slug)
	if lesson == nil {
		http.NotFound(w, r)
		return
	}
	phase := h.curriculum.FindPhaseByLesson(slug)

	err := h.templates.ExecuteTemplate(w, "lesson.html", map[string]interface{}{
		"Lesson":    lesson,
		"Phase":     phase,
		"Languages": content.SupportedLanguages,
	})
	if err != nil {
		log.Printf("template error: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

// Dashboard renders the progress dashboard
func (h *PageHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	err := h.templates.ExecuteTemplate(w, "dashboard.html", map[string]interface{}{
		"Phases": h.curriculum.Phases,
	})
	if err != nil {
		log.Printf("template error: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

