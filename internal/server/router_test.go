package server

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jcleow/assetra2/internal/finance"
	"github.com/jcleow/assetra2/internal/repository/memory"
)

func TestHealthRoute(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	repo := memory.NewRepository(finance.DefaultSeedData(time.Now().UTC()))
	router := newRouter(logger, repo)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var payload map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode payload: %v", err)
	}

	if payload["status"] != "ok" {
		t.Fatalf("unexpected status payload: %v", payload["status"])
	}
}

func TestAssetCRUDHandlers(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	repo := memory.NewRepository(finance.SeedData{})
	router := newRouter(logger, repo)

	createBody := `{"name":"RSU","category":"equity","currentValue":12000,"annualGrowthRate":0.1}`
	createReq := httptest.NewRequest(http.MethodPost, "/assets", strings.NewReader(createBody))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()

	router.ServeHTTP(createRec, createReq)

	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d", createRec.Code)
	}

	var created finance.Asset
	if err := json.Unmarshal(createRec.Body.Bytes(), &created); err != nil {
		t.Fatalf("failed to decode created asset: %v", err)
	}
	if created.ID == "" {
		t.Fatalf("expected ID to be set")
	}
	requestID := createRec.Header().Get(headerRequestID)
	if requestID == "" {
		t.Fatalf("expected request id header")
	}

	updateBody := `{"name":"RSU","category":"equity","currentValue":15000,"annualGrowthRate":0.1}`
	updateReq := httptest.NewRequest(http.MethodPatch, "/assets/"+created.ID, strings.NewReader(updateBody))
	updateReq.Header.Set("Content-Type", "application/json")
	updateRec := httptest.NewRecorder()
	router.ServeHTTP(updateRec, updateReq)
	if updateRec.Code != http.StatusOK {
		t.Fatalf("expected update status 200, got %d", updateRec.Code)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/assets", nil)
	listRec := httptest.NewRecorder()
	router.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d", listRec.Code)
	}

	deleteReq := httptest.NewRequest(http.MethodDelete, "/assets/"+created.ID, nil)
	deleteRec := httptest.NewRecorder()
	router.ServeHTTP(deleteRec, deleteReq)
	if deleteRec.Code != http.StatusNoContent {
		t.Fatalf("expected delete status 204, got %d", deleteRec.Code)
	}
}

func TestCashFlowSummary(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	seed := finance.DefaultSeedData(time.Now().UTC())
	repo := memory.NewRepository(seed)
	router := newRouter(logger, repo)

	req := httptest.NewRequest(http.MethodGet, "/cashflow", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var payload struct {
		Incomes  []finance.Income        `json:"incomes"`
		Expenses []finance.Expense       `json:"expenses"`
		Summary  finance.CashFlowSummary `json:"summary"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode json: %v", err)
	}
	if len(payload.Incomes) == 0 || len(payload.Expenses) == 0 {
		t.Fatalf("expected seed incomes and expenses")
	}
	if payload.Summary.MonthlyIncome == 0 {
		t.Fatalf("expected summary to calculate totals")
	}
}

func TestCORSMiddlewareHandlesOptions(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	repo := memory.NewRepository(finance.SeedData{})
	router := newRouter(logger, repo)

	req := httptest.NewRequest(http.MethodOptions, "/assets", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204 for preflight, got %d", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("expected CORS headers, got %q", got)
	}
}
