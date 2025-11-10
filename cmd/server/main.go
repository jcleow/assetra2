package main

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/jcleow/assetra2/internal/config"
	"github.com/jcleow/assetra2/internal/finance"
	"github.com/jcleow/assetra2/internal/logging"
	"github.com/jcleow/assetra2/internal/migrations"
	"github.com/jcleow/assetra2/internal/repository"
	pgrepo "github.com/jcleow/assetra2/internal/repository/postgres"
	"github.com/jcleow/assetra2/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	logger := logging.NewLogger(cfg.LogLevel)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	repo, cleanup, err := initRepository(ctx, cfg, logger)
	if err != nil {
		logger.Error("failed to initialize repository", "error", err)
		os.Exit(1)
	}
	defer cleanup()

	srv := server.New(cfg, logger, repo)

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

func initRepository(ctx context.Context, cfg config.Config, logger *slog.Logger) (repository.Repository, func(), error) {
	if cfg.DatabaseURL == "" {
		logger.Error("DATABASE_URL is required for the finance repository")
		return nil, func() {}, errors.New("missing DATABASE_URL")
	}

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		return nil, func() {}, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxIdleTime(5 * time.Minute)

	if err := migrations.Run(db); err != nil {
		db.Close()
		return nil, func() {}, err
	}

	repo := pgrepo.New(db)
	seedData := finance.DefaultSeedData(time.Now().UTC())
	if err := repo.SeedDefaults(ctx, seedData, logger); err != nil {
		logger.Warn("failed to seed finance data", "error", err)
	}

	cleanup := func() {
		_ = db.Close()
	}

	return repo, cleanup, nil
}
