package finance

import (
	"time"
)

// Frequency represents how often a cash-flow entry occurs.
type Frequency string

const (
	FrequencyMonthly   Frequency = "monthly"
	FrequencyBiWeekly  Frequency = "biweekly"
	FrequencyWeekly    Frequency = "weekly"
	FrequencyQuarterly Frequency = "quarterly"
	FrequencyYearly    Frequency = "yearly"
)

// Asset models a net-worth positive account (brokerage, cash, property, etc).
type Asset struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Category         string    `json:"category"`
	CurrentValue     float64   `json:"currentValue"`
	AnnualGrowthRate float64   `json:"annualGrowthRate"`
	Notes            string    `json:"notes,omitempty"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// Liability represents a debt obligation such as mortgages or credit cards.
type Liability struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Category        string    `json:"category"`
	CurrentBalance  float64   `json:"currentBalance"`
	InterestRateAPR float64   `json:"interestRateApr"`
	MinimumPayment  float64   `json:"minimumPayment"`
	Notes           string    `json:"notes,omitempty"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// Income captures recurring cash inflows.
type Income struct {
	ID        string    `json:"id"`
	Source    string    `json:"source"`
	Amount    float64   `json:"amount"`
	Frequency Frequency `json:"frequency"`
	StartDate time.Time `json:"startDate"`
	Category  string    `json:"category"`
	Notes     string    `json:"notes,omitempty"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Expense captures recurring cash outflows.
type Expense struct {
	ID        string    `json:"id"`
	Payee     string    `json:"payee"`
	Amount    float64   `json:"amount"`
	Frequency Frequency `json:"frequency"`
	Category  string    `json:"category"`
	Notes     string    `json:"notes,omitempty"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// CashFlowSummary aggregates incomes and expenses into monthly totals.
type CashFlowSummary struct {
	MonthlyIncome   float64 `json:"monthlyIncome"`
	MonthlyExpenses float64 `json:"monthlyExpenses"`
	NetMonthly      float64 `json:"netMonthly"`
}

// SeedData is a convenience structure for populating demo repositories.
type SeedData struct {
	Assets      []Asset
	Liabilities []Liability
	Incomes     []Income
	Expenses    []Expense
}
