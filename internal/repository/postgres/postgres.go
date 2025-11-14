package postgres

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"github.com/jcleow/assetra2/internal/finance"
	"github.com/jcleow/assetra2/internal/repository"
)

// Repository implements the finance Repository interface backed by Postgres.
type Repository struct {
	db            *sql.DB
	assetStore    *assetStore
	liabStore     *liabilityStore
	incomeStore   *incomeStore
	expenseStore  *expenseStore
	propertyStore *propertyScenarioStore
}

// New creates a repository backed by the provided database connection.
func New(db *sql.DB) *Repository {
	return &Repository{
		db:            db,
		assetStore:    &assetStore{db: db},
		liabStore:     &liabilityStore{db: db},
		incomeStore:   &incomeStore{db: db},
		expenseStore:  &expenseStore{db: db},
		propertyStore: &propertyScenarioStore{db: db},
	}
}

func (r *Repository) Assets() repository.AssetStore { return r.assetStore }
func (r *Repository) Liabilities() repository.LiabilityStore {
	return r.liabStore
}
func (r *Repository) Incomes() repository.IncomeStore   { return r.incomeStore }
func (r *Repository) Expenses() repository.ExpenseStore { return r.expenseStore }
func (r *Repository) PropertyPlanner() repository.PropertyPlannerStore {
	return r.propertyStore
}

type assetStore struct {
	db *sql.DB
}

func (s *assetStore) List(ctx context.Context) ([]finance.Asset, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, category, current_value, annual_growth_rate, notes, updated_at
		FROM finance_assets
		ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []finance.Asset
	for rows.Next() {
		asset, err := scanAsset(rows)
		if err != nil {
			return nil, err
		}
		assets = append(assets, asset)
	}
	if assets == nil {
		assets = []finance.Asset{}
	}
	return assets, rows.Err()
}

func (s *assetStore) Get(ctx context.Context, id string) (finance.Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, name, category, current_value, annual_growth_rate, notes, updated_at
		FROM finance_assets
		WHERE id = $1`, id)
	asset, err := scanAsset(row)
	if errors.Is(err, sql.ErrNoRows) {
		return finance.Asset{}, repository.ErrNotFound
	}
	return asset, err
}

func (s *assetStore) Create(ctx context.Context, asset finance.Asset) (finance.Asset, error) {
	if asset.Name == "" || asset.Category == "" {
		return finance.Asset{}, repository.ErrInvalidInput
	}
	asset.ID = ensureID(asset.ID)
	asset.UpdatedAt = time.Now().UTC()

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_assets (id, name, category, current_value, annual_growth_rate, notes, updated_at)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7)
		RETURNING id, name, category, current_value, annual_growth_rate, COALESCE(notes, ''), updated_at`,
		asset.ID, asset.Name, asset.Category, asset.CurrentValue, asset.AnnualGrowthRate, asset.Notes, asset.UpdatedAt)
	return scanAsset(row)
}

func (s *assetStore) Update(ctx context.Context, asset finance.Asset) (finance.Asset, error) {
	if asset.ID == "" {
		return finance.Asset{}, repository.ErrInvalidInput
	}
	asset.UpdatedAt = time.Now().UTC()

	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_assets
		SET name=$2,
		    category=$3,
		    current_value=$4,
		    annual_growth_rate=$5,
		    notes=NULLIF($6, ''),
		    updated_at=$7
		WHERE id=$1
		RETURNING id, name, category, current_value, annual_growth_rate, COALESCE(notes, ''), updated_at`,
		asset.ID, asset.Name, asset.Category, asset.CurrentValue, asset.AnnualGrowthRate, asset.Notes, asset.UpdatedAt)
	updated, err := scanAsset(row)
	if errors.Is(err, sql.ErrNoRows) {
		return finance.Asset{}, repository.ErrNotFound
	}
	return updated, err
}

func (s *assetStore) Delete(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_assets WHERE id=$1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil || rows == 0 {
		return repository.ErrNotFound
	}
	return nil
}

type liabilityStore struct {
	db *sql.DB
}

func (s *liabilityStore) List(ctx context.Context) ([]finance.Liability, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, category, current_balance, interest_rate_apr, minimum_payment, notes, updated_at
		FROM finance_liabilities
		ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []finance.Liability
	for rows.Next() {
		item, err := scanLiability(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if items == nil {
		items = []finance.Liability{}
	}
	return items, rows.Err()
}

func (s *liabilityStore) Get(ctx context.Context, id string) (finance.Liability, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, name, category, current_balance, interest_rate_apr, minimum_payment, notes, updated_at
		FROM finance_liabilities
		WHERE id = $1`, id)
	item, err := scanLiability(row)
	if errors.Is(err, sql.ErrNoRows) {
		return finance.Liability{}, repository.ErrNotFound
	}
	return item, err
}

func (s *liabilityStore) Create(ctx context.Context, liability finance.Liability) (finance.Liability, error) {
	if liability.Name == "" || liability.Category == "" {
		return finance.Liability{}, repository.ErrInvalidInput
	}
	liability.ID = ensureID(liability.ID)
	liability.UpdatedAt = time.Now().UTC()

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_liabilities (id, name, category, current_balance, interest_rate_apr, minimum_payment, notes, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), $8)
		RETURNING id, name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(notes, ''), updated_at`,
		liability.ID, liability.Name, liability.Category, liability.CurrentBalance, liability.InterestRateAPR, liability.MinimumPayment, liability.Notes, liability.UpdatedAt)
	return scanLiability(row)
}

func (s *liabilityStore) Update(ctx context.Context, liability finance.Liability) (finance.Liability, error) {
	if liability.ID == "" {
		return finance.Liability{}, repository.ErrInvalidInput
	}
	liability.UpdatedAt = time.Now().UTC()

	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_liabilities
		SET name=$2,
		    category=$3,
		    current_balance=$4,
		    interest_rate_apr=$5,
		    minimum_payment=$6,
		    notes=NULLIF($7, ''),
		    updated_at=$8
		WHERE id=$1
		RETURNING id, name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(notes, ''), updated_at`,
		liability.ID, liability.Name, liability.Category, liability.CurrentBalance, liability.InterestRateAPR, liability.MinimumPayment, liability.Notes, liability.UpdatedAt)
	updated, err := scanLiability(row)
	if errors.Is(err, sql.ErrNoRows) {
		return finance.Liability{}, repository.ErrNotFound
	}
	return updated, err
}

func (s *liabilityStore) Delete(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_liabilities WHERE id=$1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil || rows == 0 {
		return repository.ErrNotFound
	}
	return nil
}

type incomeStore struct {
	db *sql.DB
}

func (s *incomeStore) List(ctx context.Context) ([]finance.Income, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, source, amount, frequency, start_date, category, notes, updated_at
		FROM finance_incomes
		ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []finance.Income
	for rows.Next() {
		item, err := scanIncome(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if items == nil {
		items = []finance.Income{}
	}
	return items, rows.Err()
}

func (s *incomeStore) Get(ctx context.Context, id string) (finance.Income, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, source, amount, frequency, start_date, category, notes, updated_at
		FROM finance_incomes
		WHERE id = $1`, id)
	item, err := scanIncome(row)
	if errors.Is(err, sql.ErrNoRows) {
		return finance.Income{}, repository.ErrNotFound
	}
	return item, err
}

func (s *incomeStore) Create(ctx context.Context, income finance.Income) (finance.Income, error) {
	if income.Source == "" || income.Amount <= 0 {
		return finance.Income{}, repository.ErrInvalidInput
	}
	income.ID = ensureID(income.ID)
	if income.StartDate.IsZero() {
		income.StartDate = time.Now().UTC()
	}
	income.UpdatedAt = time.Now().UTC()

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_incomes (id, source, amount, frequency, start_date, category, notes, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), $8)
		RETURNING id, source, amount, frequency, start_date, category, COALESCE(notes, ''), updated_at`,
		income.ID, income.Source, income.Amount, income.Frequency, income.StartDate, income.Category, income.Notes, income.UpdatedAt)
	return scanIncome(row)
}

func (s *incomeStore) Update(ctx context.Context, income finance.Income) (finance.Income, error) {
	if income.ID == "" {
		return finance.Income{}, repository.ErrInvalidInput
	}
	income.UpdatedAt = time.Now().UTC()

	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_incomes
		SET source=$2,
		    amount=$3,
		    frequency=$4,
		    start_date=$5,
		    category=$6,
		    notes=NULLIF($7, ''),
		    updated_at=$8
		WHERE id=$1
		RETURNING id, source, amount, frequency, start_date, category, COALESCE(notes, ''), updated_at`,
		income.ID, income.Source, income.Amount, income.Frequency, income.StartDate, income.Category, income.Notes, income.UpdatedAt)
	updated, err := scanIncome(row)
	if errors.Is(err, sql.ErrNoRows) {
		return finance.Income{}, repository.ErrNotFound
	}
	return updated, err
}

func (s *incomeStore) Delete(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_incomes WHERE id=$1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil || rows == 0 {
		return repository.ErrNotFound
	}
	return nil
}

type expenseStore struct {
	db *sql.DB
}

func (s *expenseStore) List(ctx context.Context) ([]finance.Expense, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, payee, amount, frequency, category, notes, updated_at
		FROM finance_expenses
		ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []finance.Expense
	for rows.Next() {
		item, err := scanExpense(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if items == nil {
		items = []finance.Expense{}
	}
	return items, rows.Err()
}

func (s *expenseStore) Get(ctx context.Context, id string) (finance.Expense, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, payee, amount, frequency, category, notes, updated_at
		FROM finance_expenses
		WHERE id = $1`, id)
	item, err := scanExpense(row)
	if errors.Is(err, sql.ErrNoRows) {
		return finance.Expense{}, repository.ErrNotFound
	}
	return item, err
}

func (s *expenseStore) Create(ctx context.Context, expense finance.Expense) (finance.Expense, error) {
	if expense.Payee == "" || expense.Amount <= 0 {
		return finance.Expense{}, repository.ErrInvalidInput
	}
	expense.ID = ensureID(expense.ID)
	expense.UpdatedAt = time.Now().UTC()

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_expenses (id, payee, amount, frequency, category, notes, updated_at)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7)
		RETURNING id, payee, amount, frequency, category, COALESCE(notes, ''), updated_at`,
		expense.ID, expense.Payee, expense.Amount, expense.Frequency, expense.Category, expense.Notes, expense.UpdatedAt)
	return scanExpense(row)
}

func (s *expenseStore) Update(ctx context.Context, expense finance.Expense) (finance.Expense, error) {
	if expense.ID == "" {
		return finance.Expense{}, repository.ErrInvalidInput
	}
	expense.UpdatedAt = time.Now().UTC()

	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_expenses
		SET payee=$2,
		    amount=$3,
		    frequency=$4,
		    category=$5,
		    notes=NULLIF($6, ''),
		    updated_at=$7
		WHERE id=$1
		RETURNING id, payee, amount, frequency, category, COALESCE(notes, ''), updated_at`,
		expense.ID, expense.Payee, expense.Amount, expense.Frequency, expense.Category, expense.Notes, expense.UpdatedAt)
	updated, err := scanExpense(row)
	if errors.Is(err, sql.ErrNoRows) {
		return finance.Expense{}, repository.ErrNotFound
	}
	return updated, err
}

func (s *expenseStore) Delete(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_expenses WHERE id=$1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil || rows == 0 {
		return repository.ErrNotFound
	}
	return nil
}

type propertyScenarioStore struct {
	db *sql.DB
}

func (s *propertyScenarioStore) List(ctx context.Context) ([]finance.PropertyPlannerScenario, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, property_type, headline, subheadline, last_refreshed,
		       loan_inputs, amortization, snapshot, summary, timeline, milestones, insights, updated_at
		FROM property_planner_scenarios
		ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []finance.PropertyPlannerScenario
	for rows.Next() {
		item, err := scanPropertyScenario(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if items == nil {
		items = []finance.PropertyPlannerScenario{}
	}
	return items, rows.Err()
}

func (s *propertyScenarioStore) Get(ctx context.Context, id string) (finance.PropertyPlannerScenario, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, property_type, headline, subheadline, last_refreshed,
		       loan_inputs, amortization, snapshot, summary, timeline, milestones, insights, updated_at
		FROM property_planner_scenarios
		WHERE id = $1`, id)
	item, err := scanPropertyScenario(row)
	if errors.Is(err, sql.ErrNoRows) {
		return finance.PropertyPlannerScenario{}, repository.ErrNotFound
	}
	return item, err
}

func (s *propertyScenarioStore) GetByType(ctx context.Context, scenarioType string) (finance.PropertyPlannerScenario, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, property_type, headline, subheadline, last_refreshed,
		       loan_inputs, amortization, snapshot, summary, timeline, milestones, insights, updated_at
		FROM property_planner_scenarios
		WHERE property_type = $1`, scenarioType)
	item, err := scanPropertyScenario(row)
	if errors.Is(err, sql.ErrNoRows) {
		return finance.PropertyPlannerScenario{}, repository.ErrNotFound
	}
	return item, err
}

func (s *propertyScenarioStore) Create(ctx context.Context, scenario finance.PropertyPlannerScenario) (finance.PropertyPlannerScenario, error) {
	if scenario.Type == "" || scenario.Headline == "" {
		return finance.PropertyPlannerScenario{}, repository.ErrInvalidInput
	}
	scenario.ID = ensureID(scenario.ID)
	scenario.UpdatedAt = time.Now().UTC()
	payload, err := buildScenarioPayload(scenario)
	if err != nil {
		return finance.PropertyPlannerScenario{}, err
	}

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO property_planner_scenarios (
			id, property_type, headline, subheadline, last_refreshed,
			loan_inputs, amortization, snapshot, summary, timeline, milestones, insights, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id, property_type, headline, subheadline, last_refreshed,
		          loan_inputs, amortization, snapshot, summary, timeline, milestones, insights, updated_at`,
		payload.ID,
		payload.Type,
		payload.Headline,
		payload.Subheadline,
		payload.LastRefreshed,
		payload.LoanInputsJSON,
		payload.AmortizationJSON,
		payload.SnapshotJSON,
		payload.SummaryJSON,
		payload.TimelineJSON,
		payload.MilestonesJSON,
		payload.InsightsJSON,
		scenario.UpdatedAt,
	)
	created, err := scanPropertyScenario(row)
	if err != nil {
		return finance.PropertyPlannerScenario{}, err
	}
	return created, nil
}

func (s *propertyScenarioStore) Update(ctx context.Context, scenario finance.PropertyPlannerScenario) (finance.PropertyPlannerScenario, error) {
	if scenario.ID == "" {
		return finance.PropertyPlannerScenario{}, repository.ErrInvalidInput
	}
	scenario.UpdatedAt = time.Now().UTC()
	payload, err := buildScenarioPayload(scenario)
	if err != nil {
		return finance.PropertyPlannerScenario{}, err
	}

	row := s.db.QueryRowContext(ctx, `
		UPDATE property_planner_scenarios
		SET property_type=$2,
		    headline=$3,
		    subheadline=$4,
		    last_refreshed=$5,
		    loan_inputs=$6,
		    amortization=$7,
		    snapshot=$8,
		    summary=$9,
		    timeline=$10,
		    milestones=$11,
		    insights=$12,
		    updated_at=$13
		WHERE id=$1
		RETURNING id, property_type, headline, subheadline, last_refreshed,
		          loan_inputs, amortization, snapshot, summary, timeline, milestones, insights, updated_at`,
		payload.ID,
		payload.Type,
		payload.Headline,
		payload.Subheadline,
		payload.LastRefreshed,
		payload.LoanInputsJSON,
		payload.AmortizationJSON,
		payload.SnapshotJSON,
		payload.SummaryJSON,
		payload.TimelineJSON,
		payload.MilestonesJSON,
		payload.InsightsJSON,
		scenario.UpdatedAt,
	)
	updated, err := scanPropertyScenario(row)
	if errors.Is(err, sql.ErrNoRows) {
		return finance.PropertyPlannerScenario{}, repository.ErrNotFound
	}
	return updated, err
}

func (s *propertyScenarioStore) Delete(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM property_planner_scenarios WHERE id=$1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil || rows == 0 {
		return repository.ErrNotFound
	}
	return nil
}

func scanAsset(row scanner) (finance.Asset, error) {
	var asset finance.Asset
	var notes sql.NullString
	err := row.Scan(
		&asset.ID,
		&asset.Name,
		&asset.Category,
		&asset.CurrentValue,
		&asset.AnnualGrowthRate,
		&notes,
		&asset.UpdatedAt,
	)
	if err != nil {
		return finance.Asset{}, err
	}
	asset.Notes = notes.String
	return asset, nil
}

func scanLiability(row scanner) (finance.Liability, error) {
	var item finance.Liability
	var notes sql.NullString
	err := row.Scan(
		&item.ID,
		&item.Name,
		&item.Category,
		&item.CurrentBalance,
		&item.InterestRateAPR,
		&item.MinimumPayment,
		&notes,
		&item.UpdatedAt,
	)
	if err != nil {
		return finance.Liability{}, err
	}
	item.Notes = notes.String
	return item, nil
}

func scanIncome(row scanner) (finance.Income, error) {
	var item finance.Income
	var notes sql.NullString
	err := row.Scan(
		&item.ID,
		&item.Source,
		&item.Amount,
		&item.Frequency,
		&item.StartDate,
		&item.Category,
		&notes,
		&item.UpdatedAt,
	)
	if err != nil {
		return finance.Income{}, err
	}
	item.Notes = notes.String
	return item, nil
}

func scanExpense(row scanner) (finance.Expense, error) {
	var item finance.Expense
	var notes sql.NullString
	err := row.Scan(
		&item.ID,
		&item.Payee,
		&item.Amount,
		&item.Frequency,
		&item.Category,
		&notes,
		&item.UpdatedAt,
	)
	if err != nil {
		return finance.Expense{}, err
	}
	item.Notes = notes.String
	return item, nil
}

func scanPropertyScenario(row scanner) (finance.PropertyPlannerScenario, error) {
	var item finance.PropertyPlannerScenario
	var loanInputsData, amortizationData, snapshotData, summaryData, timelineData, milestonesData, insightsData []byte
	err := row.Scan(
		&item.ID,
		&item.Type,
		&item.Headline,
		&item.Subheadline,
		&item.LastRefreshed,
		&loanInputsData,
		&amortizationData,
		&snapshotData,
		&summaryData,
		&timelineData,
		&milestonesData,
		&insightsData,
		&item.UpdatedAt,
	)
	if err != nil {
		return finance.PropertyPlannerScenario{}, err
	}

	if err := json.Unmarshal(loanInputsData, &item.Inputs); err != nil {
		return finance.PropertyPlannerScenario{}, err
	}
	if err := json.Unmarshal(amortizationData, &item.Amortization); err != nil {
		return finance.PropertyPlannerScenario{}, err
	}
	if err := json.Unmarshal(snapshotData, &item.Snapshot); err != nil {
		return finance.PropertyPlannerScenario{}, err
	}
	if err := json.Unmarshal(summaryData, &item.Summary); err != nil {
		return finance.PropertyPlannerScenario{}, err
	}
	if err := json.Unmarshal(timelineData, &item.Timeline); err != nil {
		return finance.PropertyPlannerScenario{}, err
	}
	if err := json.Unmarshal(milestonesData, &item.Milestones); err != nil {
		return finance.PropertyPlannerScenario{}, err
	}
	if err := json.Unmarshal(insightsData, &item.Insights); err != nil {
		return finance.PropertyPlannerScenario{}, err
	}
	return item, nil
}

type scanner interface {
	Scan(dest ...any) error
}

type propertyScenarioDBPayload struct {
	ID               string
	Type             string
	Headline         string
	Subheadline      string
	LastRefreshed    string
	LoanInputsJSON   []byte
	AmortizationJSON []byte
	SnapshotJSON     []byte
	SummaryJSON      []byte
	TimelineJSON     []byte
	MilestonesJSON   []byte
	InsightsJSON     []byte
}

func buildScenarioPayload(s finance.PropertyPlannerScenario) (propertyScenarioDBPayload, error) {
	payload := propertyScenarioDBPayload{
		ID:            s.ID,
		Type:          s.Type,
		Headline:      s.Headline,
		Subheadline:   s.Subheadline,
		LastRefreshed: s.LastRefreshed,
	}

	if payload.Subheadline == "" {
		payload.Subheadline = ""
	}
	if payload.LastRefreshed == "" {
		payload.LastRefreshed = ""
	}
	if s.Summary == nil {
		s.Summary = []finance.PropertyPlannerSummary{}
	}
	if s.Timeline == nil {
		s.Timeline = []finance.PropertyPlannerTimeline{}
	}
	if s.Milestones == nil {
		s.Milestones = []finance.PropertyPlannerMilestone{}
	}
	if s.Insights == nil {
		s.Insights = []finance.PropertyPlannerInsight{}
	}

	var err error
	if payload.LoanInputsJSON, err = json.Marshal(s.Inputs); err != nil {
		return propertyScenarioDBPayload{}, err
	}
	if payload.AmortizationJSON, err = json.Marshal(s.Amortization); err != nil {
		return propertyScenarioDBPayload{}, err
	}
	if payload.SnapshotJSON, err = json.Marshal(s.Snapshot); err != nil {
		return propertyScenarioDBPayload{}, err
	}
	if payload.SummaryJSON, err = json.Marshal(s.Summary); err != nil {
		return propertyScenarioDBPayload{}, err
	}
	if payload.TimelineJSON, err = json.Marshal(s.Timeline); err != nil {
		return propertyScenarioDBPayload{}, err
	}
	if payload.MilestonesJSON, err = json.Marshal(s.Milestones); err != nil {
		return propertyScenarioDBPayload{}, err
	}
	if payload.InsightsJSON, err = json.Marshal(s.Insights); err != nil {
		return propertyScenarioDBPayload{}, err
	}

	return payload, nil
}

func ensureID(id string) string {
	if id != "" {
		return id
	}
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "id-" + time.Now().UTC().Format("20060102150405.000000000")
	}
	return hex.EncodeToString(b[:])
}
