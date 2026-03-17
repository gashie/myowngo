package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"goquest/internal/content"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// APIHandler serves JSON API endpoints
type APIHandler struct {
	curriculum *content.Curriculum
}

// NewAPIHandler creates an API handler
func NewAPIHandler(c *content.Curriculum) *APIHandler {
	return &APIHandler{curriculum: c}
}

// ListLessons returns all phases with lesson metadata
func (h *APIHandler) ListLessons(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.curriculum.Phases)
}

// GetLesson returns a single lesson with all content
func (h *APIHandler) GetLesson(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	lesson := h.curriculum.FindLesson(slug)
	if lesson == nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lesson)
}

// ListLanguages returns all supported source languages
func (h *APIHandler) ListLanguages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(content.SupportedLanguages)
}

// playgroundRequest is the format expected by play.golang.org
type playgroundRequest struct {
	Body    string `json:"body"`
	Version int    `json:"version"`
	WithVet bool   `json:"withVet"`
}

// RunCode proxies user code to the Go Playground API
func (h *APIHandler) RunCode(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	pgReq := playgroundRequest{
		Body:    req.Code,
		Version: 2,
		WithVet: true,
	}
	body, _ := json.Marshal(pgReq)

	resp, err := http.Post(
		"https://play.golang.org/compile",
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		http.Error(w, "Go Playground unreachable", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}

// RunCodeLocal runs Go code using the local Go compiler (if available)
func (h *APIHandler) RunCodeLocal(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodHead {
		// Check if local Go is available
		if _, err := exec.LookPath("go"); err != nil {
			http.Error(w, "go not found", http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Create temp dir
	tmpDir, err := os.MkdirTemp("", "goquest-run-*")
	if err != nil {
		jsonError(w, "failed to create temp dir")
		return
	}
	defer os.RemoveAll(tmpDir)

	// Write code file
	mainFile := filepath.Join(tmpDir, "main.go")
	if err := os.WriteFile(mainFile, []byte(req.Code), 0644); err != nil {
		jsonError(w, "failed to write code file")
		return
	}

	// Run with 10s timeout
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "go", "run", mainFile)
	cmd.Dir = tmpDir

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()

	w.Header().Set("Content-Type", "application/json")
	result := map[string]interface{}{
		"output": stdout.String(),
		"stderr": stderr.String(),
	}
	if err != nil {
		// Use err.Error() as fallback when stderr is empty (e.g. timeout, signal kill)
		errMsg := stderr.String()
		if errMsg == "" {
			errMsg = err.Error()
		}
		result["error"] = errMsg
	}
	json.NewEncoder(w).Encode(result)
}

func jsonError(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
