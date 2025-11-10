package server

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jcleow/assetra2/internal/events"
	"github.com/jcleow/assetra2/internal/finance"
	"github.com/jcleow/assetra2/internal/repository/memory"
)

func TestHealthRoute(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	repo := memory.NewRepository(finance.DefaultSeedData(time.Now().UTC()))
	hub := events.NewHub(events.WithDebounceWindow(0))
	router := newRouter(logger, repo, hub)

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
	hub := events.NewHub(events.WithDebounceWindow(0))
	router := newRouter(logger, repo, hub)

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
	hub := events.NewHub(events.WithDebounceWindow(0))
	router := newRouter(logger, repo, hub)

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
	hub := events.NewHub(events.WithDebounceWindow(0))
	router := newRouter(logger, repo, hub)

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

func TestEventStreamRequiresAuth(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	repo := memory.NewRepository(finance.SeedData{})
	hub := events.NewHub(events.WithDebounceWindow(0))
	router := newRouter(logger, repo, hub)

	req := httptest.NewRequest(http.MethodGet, "/events", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestEventStreamPublishesUpdates(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	repo := memory.NewRepository(finance.SeedData{})
	hub := events.NewHub(events.WithDebounceWindow(0))
	router := newRouter(logger, repo, hub)

	rec, cancel, done := startEventStream(t, router, "/events")
	time.Sleep(10 * time.Millisecond)

	createBody := `{"name":"Windfall","category":"cash","currentValue":100000,"annualGrowthRate":0.02}`
	createReq := httptest.NewRequest(http.MethodPost, "/assets", strings.NewReader(createBody))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	router.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected asset create 201, got %d", createRec.Code)
	}

	time.Sleep(50 * time.Millisecond)
	cancel()
	<-done

	body := rec.Body.String()
	if !strings.Contains(body, "event: asset.create") {
		t.Fatalf("expected SSE payload to include asset.create event, body=%q", body)
	}
	if !strings.Contains(body, `"name":"Windfall"`) {
		t.Fatalf("expected SSE payload to include asset data, body=%q", body)
	}
}

func TestEventStreamReplaysFromCursor(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	repo := memory.NewRepository(finance.SeedData{})
	hub := events.NewHub(events.WithDebounceWindow(0))
	router := newRouter(logger, repo, hub)

	rec1, cancel1, done1 := startEventStream(t, router, "/events")
	time.Sleep(10 * time.Millisecond)

	createBody := `{"name":"Replay","category":"brokerage","currentValue":5000,"annualGrowthRate":0.05}`
	createReq := httptest.NewRequest(http.MethodPost, "/assets", strings.NewReader(createBody))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	router.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 when creating asset, got %d", createRec.Code)
	}

	var created finance.Asset
	if err := json.Unmarshal(createRec.Body.Bytes(), &created); err != nil {
		t.Fatalf("failed to decode created asset: %v", err)
	}

	time.Sleep(50 * time.Millisecond)
	cancel1()
	<-done1

	cursor := extractLastCursor(rec1.Body.String())
	if cursor == "" {
		t.Fatalf("expected cursor in first SSE response, body=%q", rec1.Body.String())
	}

	updateBody := `{"name":"Replay","category":"brokerage","currentValue":9000,"annualGrowthRate":0.05}`
	updateReq := httptest.NewRequest(http.MethodPatch, "/assets/"+created.ID, strings.NewReader(updateBody))
	updateReq.Header.Set("Content-Type", "application/json")
	updateRec := httptest.NewRecorder()
	router.ServeHTTP(updateRec, updateReq)
	if updateRec.Code != http.StatusOK {
		t.Fatalf("expected 200 when updating asset, got %d", updateRec.Code)
	}

	rec2, cancel2, done2 := startEventStream(t, router, "/events?cursor="+cursor)
	time.Sleep(50 * time.Millisecond)
	cancel2()
	<-done2

	body := rec2.Body.String()
	if !strings.Contains(body, "event: asset.update") {
		t.Fatalf("expected replayed asset.update event, body=%q", body)
	}
	if !strings.Contains(body, created.ID) {
		t.Fatalf("expected payload to include asset id %q, body=%q", created.ID, body)
	}
}

func startEventStream(t *testing.T, router http.Handler, url string) (*httptest.ResponseRecorder, context.CancelFunc, <-chan struct{}) {
	t.Helper()

	req := httptest.NewRequest(http.MethodGet, url, nil)
	req.Header.Set("Authorization", "Bearer test-session")

	ctx, cancel := context.WithCancel(req.Context())
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	done := make(chan struct{})

	go func() {
		router.ServeHTTP(rec, req)
		close(done)
	}()

	return rec, cancel, done
}

func extractLastCursor(body string) string {
	lines := strings.Split(body, "\n")
	var cursor string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "id: ") {
			cursor = strings.TrimSpace(strings.TrimPrefix(line, "id: "))
		}
	}
	return cursor
}
