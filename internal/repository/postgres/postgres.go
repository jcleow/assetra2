package postgres

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"time"

	"github.com/jcleow/assetra2/internal/finance"
	"github.com/jcleow/assetra2/internal/repository"
)

// Repository implements the finance Repository interface backed by Postgres.
type Repository struct {
	db           *sql.DB
	assetStore   *assetStore
	liabStore    *liabilityStore
	incomeStore  *incomeStore
	expenseStore *expenseStore
}

// New creates a repository backed by the provided database connection.
func New(db *sql.DB) *Repository {
	return &Repository{
		db:           db,
		assetStore:   &assetStore{db: db},
		liabStore:    &liabilityStore{db: db},
		incomeStore:  &incomeStore{db: db},
		expenseStore: &expenseStore{db: db},
	}
}

func (r *Repository) Assets() repository.AssetStore { return r.assetStore }
func (r *Repository) Liabilities() repository.LiabilityStore {
	return r.liabStore
}
func (r *Repository) Incomes() repository.IncomeStore   { return r.incomeStore }
func (r *Repository) Expenses() repository.ExpenseStore { return r.expenseStore }

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

type scanner interface {
	Scan(dest ...any) error
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
