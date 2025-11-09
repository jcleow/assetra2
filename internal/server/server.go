package server

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/jcleow/assetra2/internal/config"
	"github.com/jcleow/assetra2/internal/repository"
)

// Server wraps the HTTP server and supporting dependencies.
type Server struct {
	logger     *slog.Logger
	httpServer *http.Server
}

// New configures the HTTP server with routes and sensible defaults.
func New(cfg config.Config, logger *slog.Logger, repo repository.Repository) *Server {
	mux := newRouter(logger, repo)

	httpServer := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           mux,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
	}

	return &Server{
		logger:     logger,
		httpServer: httpServer,
	}
}

// Start begins listening for HTTP requests.
func (s *Server) Start() error {
	s.logger.Info("server listening", "addr", s.httpServer.Addr)
	return s.httpServer.ListenAndServe()
}

// Shutdown gracefully stops the HTTP server.
func (s *Server) Shutdown(ctx context.Context) error {
	s.logger.Info("server shutting down")
	return s.httpServer.Shutdown(ctx)
}

// Addr exposes the bound address for testing.
func (s *Server) Addr() string {
	return s.httpServer.Addr
}
