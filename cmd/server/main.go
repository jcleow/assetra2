package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jcleow/assetra2/internal/config"
	"github.com/jcleow/assetra2/internal/finance"
	"github.com/jcleow/assetra2/internal/logging"
	"github.com/jcleow/assetra2/internal/repository/memory"
	"github.com/jcleow/assetra2/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	logger := logging.NewLogger(cfg.LogLevel)

	seed := finance.DefaultSeedData(time.Now().UTC())
	repo := memory.NewRepository(seed)

	srv := server.New(cfg, logger, repo)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			logger.Error("graceful shutdown failed", "error", err)
		}
	}()

	if err := srv.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server encountered an error", "error", err)
		os.Exit(1)
	}
}
