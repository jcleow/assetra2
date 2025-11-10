package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config captures runtime settings for the Go service.
type Config struct {
	AppEnv            string
	Host              string
	Port              int
	LogLevel          string
	ShutdownTimeout   time.Duration
	ReadHeaderTimeout time.Duration
	DatabaseURL       string
}

// Load builds a Config from environment variables, applying sensible defaults.
func Load() (Config, error) {
	cfg := Config{
		AppEnv:            getString("APP_ENV", "development"),
		Host:              getString("SERVER_HOST", "0.0.0.0"),
		Port:              8080,
		LogLevel:          strings.ToLower(getString("LOG_LEVEL", "info")),
		ShutdownTimeout:   10 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		DatabaseURL:       resolveDatabaseURL(),
	}

	if v := os.Getenv("SERVER_PORT"); v != "" {
		port, err := strconv.Atoi(v)
		if err != nil {
			return Config{}, fmt.Errorf("invalid SERVER_PORT %q: %w", v, err)
		}
		cfg.Port = port
	}

	if v := os.Getenv("SHUTDOWN_TIMEOUT"); v != "" {
		duration, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("invalid SHUTDOWN_TIMEOUT %q: %w", v, err)
		}
		cfg.ShutdownTimeout = duration
	}

	if v := os.Getenv("READ_HEADER_TIMEOUT"); v != "" {
		duration, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("invalid READ_HEADER_TIMEOUT %q: %w", v, err)
		}
		cfg.ReadHeaderTimeout = duration
	}

	if err := validate(cfg); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

// Addr returns the host:port pair for HTTP listeners.
func (c Config) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

func getString(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func validate(cfg Config) error {
	if cfg.Port <= 0 || cfg.Port > 65535 {
		return errors.New("SERVER_PORT must be between 1 and 65535")
	}
	if cfg.ShutdownTimeout <= 0 {
		return errors.New("SHUTDOWN_TIMEOUT must be greater than zero")
	}
	if cfg.ReadHeaderTimeout <= 0 {
		return errors.New("READ_HEADER_TIMEOUT must be greater than zero")
	}
	return nil
}

func resolveDatabaseURL() string {
	if v := strings.TrimSpace(os.Getenv("DATABASE_URL")); v != "" {
		return v
	}
	// Backwards compatibility with previous tooling.
	return strings.TrimSpace(os.Getenv("POSTGRES_URL"))
}
