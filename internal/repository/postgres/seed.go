package postgres

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/jcleow/assetra2/internal/finance"
)

// SeedDefaults inserts the provided seed data if the finance tables are empty.
func (r *Repository) SeedDefaults(ctx context.Context, seed finance.SeedData, logger *slog.Logger) error {
	hasData, err := r.hasExistingData(ctx)
	if err != nil {
		return err
	}
	if hasData {
		return nil
	}

	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err := insertAssets(ctx, tx, seed.Assets); err != nil {
		return err
	}
	if err := insertLiabilities(ctx, tx, seed.Liabilities); err != nil {
		return err
	}
	if err := insertIncomes(ctx, tx, seed.Incomes); err != nil {
		return err
	}
	if err := insertExpenses(ctx, tx, seed.Expenses); err != nil {
		return err
	}
	if err := insertPropertyScenarios(ctx, tx, seed.PropertyScenarios); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	if logger != nil {
		logger.Info("seeded finance data into postgres")
	}
	return nil
}

func (r *Repository) hasExistingData(ctx context.Context) (bool, error) {
	tables := []string{
		"finance_assets",
		"finance_liabilities",
		"finance_incomes",
		"finance_expenses",
		"property_planner_scenarios",
	}
	for _, tbl := range tables {
		var count int
		if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM "+tbl).Scan(&count); err != nil {
			return false, err
		}
		if count > 0 {
			return true, nil
		}
	}
	return false, nil
}

func insertAssets(ctx context.Context, tx *sql.Tx, assets []finance.Asset) error {
	for _, asset := range assets {
		asset.ID = ensureID(asset.ID)
		if asset.UpdatedAt.IsZero() {
			asset.UpdatedAt = time.Now().UTC()
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO finance_assets (id, name, category, current_value, annual_growth_rate, notes, updated_at)
			VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7)
		`, asset.ID, asset.Name, asset.Category, asset.CurrentValue, asset.AnnualGrowthRate, asset.Notes, asset.UpdatedAt); err != nil {
			return err
		}
	}
	return nil
}

func insertLiabilities(ctx context.Context, tx *sql.Tx, items []finance.Liability) error {
	for _, liab := range items {
		liab.ID = ensureID(liab.ID)
		if liab.UpdatedAt.IsZero() {
			liab.UpdatedAt = time.Now().UTC()
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO finance_liabilities (id, name, category, current_balance, interest_rate_apr, minimum_payment, notes, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), $8)
		`, liab.ID, liab.Name, liab.Category, liab.CurrentBalance, liab.InterestRateAPR, liab.MinimumPayment, liab.Notes, liab.UpdatedAt); err != nil {
			return err
		}
	}
	return nil
}

func insertIncomes(ctx context.Context, tx *sql.Tx, items []finance.Income) error {
	for _, income := range items {
		income.ID = ensureID(income.ID)
		if income.StartDate.IsZero() {
			income.StartDate = time.Now().UTC()
		}
		if income.UpdatedAt.IsZero() {
			income.UpdatedAt = time.Now().UTC()
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO finance_incomes (id, source, amount, frequency, start_date, category, notes, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), $8)
		`, income.ID, income.Source, income.Amount, income.Frequency, income.StartDate, income.Category, income.Notes, income.UpdatedAt); err != nil {
			return err
		}
	}
	return nil
}

func insertExpenses(ctx context.Context, tx *sql.Tx, items []finance.Expense) error {
	for _, expense := range items {
		expense.ID = ensureID(expense.ID)
		if expense.UpdatedAt.IsZero() {
			expense.UpdatedAt = time.Now().UTC()
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO finance_expenses (id, payee, amount, frequency, category, notes, updated_at)
			VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7)
		`, expense.ID, expense.Payee, expense.Amount, expense.Frequency, expense.Category, expense.Notes, expense.UpdatedAt); err != nil {
			return err
		}
	}
	return nil
}

func insertPropertyScenarios(ctx context.Context, tx *sql.Tx, items []finance.PropertyPlannerScenario) error {
	for _, scenario := range items {
		scenario.ID = ensureID(scenario.ID)
		if scenario.UpdatedAt.IsZero() {
			scenario.UpdatedAt = time.Now().UTC()
		}
		payload, err := buildScenarioPayload(scenario)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO property_planner_scenarios (
				id, property_type, headline, subheadline, last_refreshed,
				loan_inputs, amortization, snapshot, summary, timeline, milestones, insights, updated_at
			)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		`,
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
		); err != nil {
			return err
		}
	}
	return nil
}
