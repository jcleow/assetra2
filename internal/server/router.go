package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/jcleow/assetra2/internal/events"
	"github.com/jcleow/assetra2/internal/finance"
	"github.com/jcleow/assetra2/internal/repository"
)

const (
	headerRequestID     = "X-Request-ID"
	headerSessionToken  = "X-Session-Token"
	maxRequestBodyBytes = 1 << 20 // 1 MiB
)

type router struct {
	logger *slog.Logger
	repo   repository.Repository
	events *events.Hub
}

func newRouter(logger *slog.Logger, repo repository.Repository, hub *events.Hub) http.Handler {
	rt := &router{
		logger: logger,
		repo:   repo,
		events: hub,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)

	mux.HandleFunc("/assets", rt.handleAssetsCollection)
	mux.HandleFunc("/assets/", rt.handleAssetItem)

	mux.HandleFunc("/liabilities", rt.handleLiabilitiesCollection)
	mux.HandleFunc("/liabilities/", rt.handleLiabilityItem)

	mux.HandleFunc("/cashflow", rt.handleCashFlowSummary)
	mux.HandleFunc("/cashflow/incomes", rt.handleIncomesCollection)
	mux.HandleFunc("/cashflow/incomes/", rt.handleIncomeItem)
	mux.HandleFunc("/cashflow/expenses", rt.handleExpensesCollection)
	mux.HandleFunc("/cashflow/expenses/", rt.handleExpenseItem)
	mux.HandleFunc("/events", rt.handleEventStream)
	mux.HandleFunc("/property-planner/scenarios", rt.handlePropertyScenariosCollection)
	mux.HandleFunc("/property-planner/scenarios/", rt.handlePropertyScenarioItem)

	handler := requestIDMiddleware(loggingMiddleware(corsMiddleware(mux), logger))
	return handler
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (rt *router) handleEventStream(w http.ResponseWriter, r *http.Request) {
	fmt.Println("handling new connections!")
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	if token := extractSessionToken(r); token == "" {
		unauthorized(w)
		return
	}
	if rt.events == nil {
		internalError(w)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		internalError(w)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ctx := r.Context()
	cursor := r.URL.Query().Get("cursor")

	stream, err := rt.events.Subscribe(ctx, cursor)
	if err != nil {
		internalError(w)
		return
	}

	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case evt, ok := <-stream:
			if !ok {
				return
			}
			payload, err := json.Marshal(evt)
			if err != nil {
				rt.logger.Warn("failed to marshal stream event", "error", err)
				continue
			}
			fmt.Fprintf(w, "id: %s\n", evt.Cursor)
			fmt.Fprintf(w, "event: %s.%s\n", evt.Entity, evt.Action)
			fmt.Fprintf(w, "data: %s\n\n", payload)
			flusher.Flush()
		case <-heartbeat.C:
			fmt.Fprintf(w, ": ping %d\n\n", time.Now().Unix())
			flusher.Flush()
		case <-ctx.Done():
			return
		}
	}
}

func (rt *router) handleAssetsCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rt.listAssets(w, r)
	case http.MethodPost:
		rt.createAsset(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (rt *router) handleAssetItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/assets/")
	if id == "" {
		notFound(w)
		return
	}

	switch r.Method {
	case http.MethodGet:
		rt.getAsset(w, r, id)
	case http.MethodPatch:
		rt.updateAsset(w, r, id)
	case http.MethodDelete:
		rt.deleteAsset(w, r, id)
	default:
		methodNotAllowed(w)
	}
}

func (rt *router) listAssets(w http.ResponseWriter, r *http.Request) {
	items, err := rt.repo.Assets().List(r.Context())
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (rt *router) getAsset(w http.ResponseWriter, r *http.Request, id string) {
	asset, err := rt.repo.Assets().Get(r.Context(), id)
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, asset)
}

func (rt *router) createAsset(w http.ResponseWriter, r *http.Request) {
	var payload assetPayload
	if err := decodeJSONBody(w, r, &payload); err != nil {
		badRequest(w, err)
		return
	}
	if err := payload.validate(); err != nil {
		badRequest(w, err)
		return
	}

	created, err := rt.repo.Assets().Create(r.Context(), payload.toAsset())
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
	rt.publishChange("asset", "create", created.ID, created)
}

func (rt *router) updateAsset(w http.ResponseWriter, r *http.Request, id string) {
	var payload assetPayload
	if err := decodeJSONBody(w, r, &payload); err != nil {
		badRequest(w, err)
		return
	}

	payload.ID = id
	if err := payload.validate(); err != nil {
		badRequest(w, err)
		return
	}

	updated, err := rt.repo.Assets().Update(r.Context(), payload.toAsset())
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
	rt.publishChange("asset", "update", updated.ID, updated)
}

func (rt *router) deleteAsset(w http.ResponseWriter, r *http.Request, id string) {
	if err := rt.repo.Assets().Delete(r.Context(), id); err != nil {
		handleRepoError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
	rt.publishChange("asset", "delete", id, map[string]string{"id": id})
}

func (rt *router) handleLiabilitiesCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rt.listLiabilities(w, r)
	case http.MethodPost:
		rt.createLiability(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (rt *router) handleLiabilityItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/liabilities/")
	if id == "" {
		notFound(w)
		return
	}

	switch r.Method {
	case http.MethodGet:
		rt.getLiability(w, r, id)
	case http.MethodPatch:
		rt.updateLiability(w, r, id)
	case http.MethodDelete:
		rt.deleteLiability(w, r, id)
	default:
		methodNotAllowed(w)
	}
}

func (rt *router) listLiabilities(w http.ResponseWriter, r *http.Request) {
	items, err := rt.repo.Liabilities().List(r.Context())
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (rt *router) getLiability(w http.ResponseWriter, r *http.Request, id string) {
	item, err := rt.repo.Liabilities().Get(r.Context(), id)
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (rt *router) createLiability(w http.ResponseWriter, r *http.Request) {
	var payload liabilityPayload
	if err := decodeJSONBody(w, r, &payload); err != nil {
		badRequest(w, err)
		return
	}
	if err := payload.validate(); err != nil {
		badRequest(w, err)
		return
	}

	created, err := rt.repo.Liabilities().Create(r.Context(), payload.toLiability())
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
	rt.publishChange("liability", "create", created.ID, created)
	fmt.Println("Published changed on liability create")
}

func (rt *router) updateLiability(w http.ResponseWriter, r *http.Request, id string) {
	var payload liabilityPayload
	if err := decodeJSONBody(w, r, &payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	if err := payload.validate(); err != nil {
		badRequest(w, err)
		return
	}

	updated, err := rt.repo.Liabilities().Update(r.Context(), payload.toLiability())
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
	rt.publishChange("liability", "update", updated.ID, updated)
	fmt.Println("Published changed on liability update")
}

func (rt *router) deleteLiability(w http.ResponseWriter, r *http.Request, id string) {
	if err := rt.repo.Liabilities().Delete(r.Context(), id); err != nil {
		handleRepoError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
	rt.publishChange("liability", "delete", id, map[string]string{"id": id})
}

func (rt *router) handleCashFlowSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	incomes, err := rt.repo.Incomes().List(r.Context())
	if err != nil {
		internalError(w)
		return
	}
	expenses, err := rt.repo.Expenses().List(r.Context())
	if err != nil {
		internalError(w)
		return
	}

	summary := finance.MonthlyCashFlow(incomes, expenses)
	writeJSON(w, http.StatusOK, map[string]any{
		"incomes":  incomes,
		"expenses": expenses,
		"summary":  summary,
	})
}

func (rt *router) handleIncomesCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rt.listIncomes(w, r)
	case http.MethodPost:
		rt.createIncome(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (rt *router) handleIncomeItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/cashflow/incomes/")
	if id == "" {
		notFound(w)
		return
	}

	switch r.Method {
	case http.MethodGet:
		rt.getIncome(w, r, id)
	case http.MethodPatch:
		rt.updateIncome(w, r, id)
	case http.MethodDelete:
		rt.deleteIncome(w, r, id)
	default:
		methodNotAllowed(w)
	}
}

func (rt *router) listIncomes(w http.ResponseWriter, r *http.Request) {
	items, err := rt.repo.Incomes().List(r.Context())
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (rt *router) getIncome(w http.ResponseWriter, r *http.Request, id string) {
	item, err := rt.repo.Incomes().Get(r.Context(), id)
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (rt *router) createIncome(w http.ResponseWriter, r *http.Request) {
	var payload incomePayload
	if err := decodeJSONBody(w, r, &payload); err != nil {
		badRequest(w, err)
		return
	}
	if err := payload.validate(); err != nil {
		badRequest(w, err)
		return
	}

	entity, err := payload.toIncome()
	if err != nil {
		badRequest(w, err)
		return
	}

	created, err := rt.repo.Incomes().Create(r.Context(), entity)
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
	rt.publishChange("income", "create", created.ID, created)
}

func (rt *router) updateIncome(w http.ResponseWriter, r *http.Request, id string) {
	var payload incomePayload
	if err := decodeJSONBody(w, r, &payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	if err := payload.validate(); err != nil {
		badRequest(w, err)
		return
	}
	entity, err := payload.toIncome()
	if err != nil {
		badRequest(w, err)
		return
	}

	updated, err := rt.repo.Incomes().Update(r.Context(), entity)
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
	rt.publishChange("income", "update", updated.ID, updated)
}

func (rt *router) deleteIncome(w http.ResponseWriter, r *http.Request, id string) {
	if err := rt.repo.Incomes().Delete(r.Context(), id); err != nil {
		handleRepoError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
	rt.publishChange("income", "delete", id, map[string]string{"id": id})
}

func (rt *router) handleExpensesCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rt.listExpenses(w, r)
	case http.MethodPost:
		rt.createExpense(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (rt *router) handleExpenseItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/cashflow/expenses/")
	if id == "" {
		notFound(w)
		return
	}

	switch r.Method {
	case http.MethodGet:
		rt.getExpense(w, r, id)
	case http.MethodPatch:
		rt.updateExpense(w, r, id)
	case http.MethodDelete:
		rt.deleteExpense(w, r, id)
	default:
		methodNotAllowed(w)
	}
}

func (rt *router) handlePropertyScenariosCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rt.listPropertyScenarios(w, r)
	case http.MethodPost:
		rt.createPropertyScenario(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (rt *router) handlePropertyScenarioItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/property-planner/scenarios/")
	if id == "" {
		notFound(w)
		return
	}

	switch r.Method {
	case http.MethodGet:
		rt.getPropertyScenario(w, r, id)
	case http.MethodPut, http.MethodPatch:
		rt.updatePropertyScenario(w, r, id)
	case http.MethodDelete:
		rt.deletePropertyScenario(w, r, id)
	default:
		methodNotAllowed(w)
	}
}

func (rt *router) listExpenses(w http.ResponseWriter, r *http.Request) {
	items, err := rt.repo.Expenses().List(r.Context())
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (rt *router) getExpense(w http.ResponseWriter, r *http.Request, id string) {
	item, err := rt.repo.Expenses().Get(r.Context(), id)
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (rt *router) createExpense(w http.ResponseWriter, r *http.Request) {
	var payload expensePayload
	if err := decodeJSONBody(w, r, &payload); err != nil {
		badRequest(w, err)
		return
	}
	if err := payload.validate(); err != nil {
		badRequest(w, err)
		return
	}

	entity := payload.toExpense()
	created, err := rt.repo.Expenses().Create(r.Context(), entity)
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
	rt.publishChange("expense", "create", created.ID, created)
}

func (rt *router) updateExpense(w http.ResponseWriter, r *http.Request, id string) {
	var payload expensePayload
	if err := decodeJSONBody(w, r, &payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	if err := payload.validate(); err != nil {
		badRequest(w, err)
		return
	}

	entity := payload.toExpense()
	updated, err := rt.repo.Expenses().Update(r.Context(), entity)
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
	rt.publishChange("expense", "update", updated.ID, updated)
}

func (rt *router) deleteExpense(w http.ResponseWriter, r *http.Request, id string) {
	if err := rt.repo.Expenses().Delete(r.Context(), id); err != nil {
		handleRepoError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
	rt.publishChange("expense", "delete", id, map[string]string{"id": id})
}

func (rt *router) listPropertyScenarios(w http.ResponseWriter, r *http.Request) {
	items, err := rt.repo.PropertyPlanner().List(r.Context())
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (rt *router) getPropertyScenario(w http.ResponseWriter, r *http.Request, id string) {
	item, err := rt.repo.PropertyPlanner().Get(r.Context(), id)
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (rt *router) createPropertyScenario(w http.ResponseWriter, r *http.Request) {
	var payload propertyScenarioPayload
	if err := decodeJSONBody(w, r, &payload); err != nil {
		badRequest(w, err)
		return
	}
	if err := payload.validate(); err != nil {
		badRequest(w, err)
		return
	}

	entity := payload.toScenario()
	created, err := rt.repo.PropertyPlanner().Create(r.Context(), entity)
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
	rt.publishChange("propertyScenario", "create", created.ID, created)
}

func (rt *router) updatePropertyScenario(w http.ResponseWriter, r *http.Request, id string) {
	var payload propertyScenarioPayload
	if err := decodeJSONBody(w, r, &payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	if err := payload.validate(); err != nil {
		badRequest(w, err)
		return
	}

	entity := payload.toScenario()
	updated, err := rt.repo.PropertyPlanner().Update(r.Context(), entity)
	if err != nil {
		handleRepoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
	rt.publishChange("propertyScenario", "update", updated.ID, updated)
}

func (rt *router) deletePropertyScenario(w http.ResponseWriter, r *http.Request, id string) {
	if err := rt.repo.PropertyPlanner().Delete(r.Context(), id); err != nil {
		handleRepoError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
	rt.publishChange("propertyScenario", "delete", id, map[string]string{"id": id})
}

func (rt *router) publishChange(entity, action, id string, payload any) {
	if rt.events == nil {
		return
	}
	rt.events.Publish(events.StreamEvent{
		Type:       "finance.change",
		Entity:     entity,
		Action:     action,
		ResourceID: id,
		Data:       payload,
	})

	fmt.Printf("finance change for %s %s", entity, action)
}

// --- payload helpers ---

type assetPayload struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Category         string  `json:"category"`
	CurrentValue     float64 `json:"currentValue"`
	AnnualGrowthRate float64 `json:"annualGrowthRate"`
	Notes            *string `json:"notes"`
}

func (p assetPayload) validate() error {
	if strings.TrimSpace(p.Name) == "" {
		return errors.New("name is required")
	}
	if strings.TrimSpace(p.Category) == "" {
		return errors.New("category is required")
	}
	return nil
}

func (p assetPayload) toAsset() finance.Asset {
	return finance.Asset{
		ID:               p.ID,
		Name:             strings.TrimSpace(p.Name),
		Category:         strings.TrimSpace(p.Category),
		CurrentValue:     p.CurrentValue,
		AnnualGrowthRate: p.AnnualGrowthRate,
		Notes:            stringOrEmpty(p.Notes),
	}
}

type liabilityPayload struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Category        string  `json:"category"`
	CurrentBalance  float64 `json:"currentBalance"`
	InterestRateAPR float64 `json:"interestRateApr"`
	MinimumPayment  float64 `json:"minimumPayment"`
	Notes           *string `json:"notes"`
}

func (p liabilityPayload) validate() error {
	if strings.TrimSpace(p.Name) == "" {
		return errors.New("name is required")
	}
	if strings.TrimSpace(p.Category) == "" {
		return errors.New("category is required")
	}
	return nil
}

func (p liabilityPayload) toLiability() finance.Liability {
	return finance.Liability{
		ID:              p.ID,
		Name:            strings.TrimSpace(p.Name),
		Category:        strings.TrimSpace(p.Category),
		CurrentBalance:  p.CurrentBalance,
		InterestRateAPR: p.InterestRateAPR,
		MinimumPayment:  p.MinimumPayment,
		Notes:           stringOrEmpty(p.Notes),
	}
}

type incomePayload struct {
	ID        string            `json:"id"`
	Source    string            `json:"source"`
	Amount    float64           `json:"amount"`
	Frequency finance.Frequency `json:"frequency"`
	StartDate string            `json:"startDate"`
	Category  string            `json:"category"`
	Notes     *string           `json:"notes"`
}

func (p incomePayload) validate() error {
	if strings.TrimSpace(p.Source) == "" {
		return errors.New("source is required")
	}
	if p.Amount <= 0 {
		return errors.New("amount must be greater than zero")
	}
	if !validFrequency(p.Frequency) {
		return fmt.Errorf("frequency %q is invalid", p.Frequency)
	}
	if strings.TrimSpace(p.StartDate) == "" {
		return errors.New("startDate is required")
	}
	return nil
}

func (p incomePayload) toIncome() (finance.Income, error) {
	startDate, err := time.Parse(time.RFC3339, p.StartDate)
	if err != nil {
		return finance.Income{}, fmt.Errorf("invalid startDate: %w", err)
	}
	return finance.Income{
		ID:        p.ID,
		Source:    strings.TrimSpace(p.Source),
		Amount:    p.Amount,
		Frequency: p.Frequency,
		StartDate: startDate,
		Category:  strings.TrimSpace(p.Category),
		Notes:     stringOrEmpty(p.Notes),
	}, nil
}

type expensePayload struct {
	ID        string            `json:"id"`
	Payee     string            `json:"payee"`
	Amount    float64           `json:"amount"`
	Frequency finance.Frequency `json:"frequency"`
	Category  string            `json:"category"`
	Notes     *string           `json:"notes"`
}

func (p expensePayload) validate() error {
	if strings.TrimSpace(p.Payee) == "" {
		return errors.New("payee is required")
	}
	if p.Amount <= 0 {
		return errors.New("amount must be greater than zero")
	}
	if !validFrequency(p.Frequency) {
		return fmt.Errorf("frequency %q is invalid", p.Frequency)
	}
	return nil
}

func (p expensePayload) toExpense() finance.Expense {
	return finance.Expense{
		ID:        p.ID,
		Payee:     strings.TrimSpace(p.Payee),
		Amount:    p.Amount,
		Frequency: p.Frequency,
		Category:  strings.TrimSpace(p.Category),
		Notes:     stringOrEmpty(p.Notes),
	}
}

type propertyScenarioPayload struct {
	ID            string                             `json:"id"`
	Type          string                             `json:"type"`
	Headline      string                             `json:"headline"`
	Subheadline   string                             `json:"subheadline"`
	LastRefreshed string                             `json:"lastRefreshed"`
	Inputs        finance.MortgageInputs             `json:"inputs"`
	Amortization  finance.MortgageAmortization       `json:"amortization"`
	Snapshot      finance.MortgageSnapshot           `json:"snapshot"`
	Summary       []finance.PropertyPlannerSummary   `json:"summary"`
	Timeline      []finance.PropertyPlannerTimeline  `json:"timeline"`
	Milestones    []finance.PropertyPlannerMilestone `json:"milestones"`
	Insights      []finance.PropertyPlannerInsight   `json:"insights"`
}

func (p propertyScenarioPayload) validate() error {
	if strings.TrimSpace(p.Type) == "" {
		return errors.New("type is required")
	}
	if strings.TrimSpace(p.Headline) == "" {
		return errors.New("headline is required")
	}
	return nil
}

func (p propertyScenarioPayload) toScenario() finance.PropertyPlannerScenario {
	return finance.PropertyPlannerScenario{
		ID:            p.ID,
		Type:          strings.TrimSpace(p.Type),
		Headline:      strings.TrimSpace(p.Headline),
		Subheadline:   strings.TrimSpace(p.Subheadline),
		LastRefreshed: strings.TrimSpace(p.LastRefreshed),
		Inputs:        p.Inputs,
		Amortization:  p.Amortization,
		Snapshot:      p.Snapshot,
		Summary:       p.Summary,
		Timeline:      p.Timeline,
		Milestones:    p.Milestones,
		Insights:      p.Insights,
	}
}

func stringOrEmpty(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}

func validFrequency(f finance.Frequency) bool {
	switch f {
	case finance.FrequencyWeekly,
		finance.FrequencyBiWeekly,
		finance.FrequencyMonthly,
		finance.FrequencyQuarterly,
		finance.FrequencyYearly:
		return true
	default:
		return false
	}
}

// --- middleware & helpers ---

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
		allowedHeaders := strings.Join([]string{
			"Content-Type",
			"X-Requested-With",
			headerRequestID,
			headerSessionToken,
			"Authorization",
		}, ", ")
		w.Header().Set("Access-Control-Allow-Headers", allowedHeaders)
		w.Header().Set("Access-Control-Expose-Headers", headerRequestID)

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get(headerRequestID)
		if requestID == "" {
			requestID = newRequestID()
		}
		ctx := context.WithValue(r.Context(), requestIDKey{}, requestID)
		w.Header().Set(headerRequestID, requestID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func loggingMiddleware(next http.Handler, logger *slog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lw := &loggingResponseWriter{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(lw, r)

		logger.Info("request completed",
			"method", r.Method,
			"path", r.URL.Path,
			"status", lw.status,
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", requestIDFromContext(r.Context()),
		)
	})
}

type loggingResponseWriter struct {
	http.ResponseWriter
	status int
}

func (w *loggingResponseWriter) WriteHeader(statusCode int) {
	w.status = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *loggingResponseWriter) Flush() {
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

type requestIDKey struct{}

func requestIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(requestIDKey{}).(string); ok {
		return v
	}
	return ""
}

func newRequestID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("req-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b[:])
}

func extractSessionToken(r *http.Request) string {
	if token := strings.TrimSpace(r.Header.Get(headerSessionToken)); token != "" {
		return token
	}

	if auth := strings.TrimSpace(r.Header.Get("Authorization")); strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		return strings.TrimSpace(auth[len("bearer "):])
	}

	return strings.TrimSpace(r.URL.Query().Get("session"))
}

func decodeJSONBody(w http.ResponseWriter, r *http.Request, dst any) error {
	defer r.Body.Close()
	reader := http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	dec := json.NewDecoder(reader)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	if dec.More() {
		return errors.New("body must contain a single JSON object")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
	}
}

func badRequest(w http.ResponseWriter, err error) {
	writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
}

func internalError(w http.ResponseWriter) {
	writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
}

func unauthorized(w http.ResponseWriter) {
	writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
}

func notFound(w http.ResponseWriter) {
	writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
}

func methodNotAllowed(w http.ResponseWriter) {
	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
}

func handleRepoError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		notFound(w)
	case errors.Is(err, repository.ErrInvalidInput):
		badRequest(w, err)
	default:
		internalError(w)
	}
}
