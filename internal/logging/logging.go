package logging

import (
	"log/slog"
	"os"
	"strings"
)

// NewLogger returns a structured slog.Logger configured for the provided level.
func NewLogger(level string) *slog.Logger {
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level:     parseLevel(level),
		AddSource: strings.ToLower(level) == "debug",
	})

	return slog.New(handler)
}

func parseLevel(level string) slog.Leveler {
	switch strings.ToLower(level) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
