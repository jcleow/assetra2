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

// PropertyPlannerScenario captures the state of the mortgage planner UI.
type PropertyPlannerScenario struct {
	ID            string                     `json:"id"`
	Type          string                     `json:"type"`
	Headline      string                     `json:"headline"`
	Subheadline   string                     `json:"subheadline"`
	LastRefreshed string                     `json:"lastRefreshed"`
	Inputs        MortgageInputs             `json:"inputs"`
	Amortization  MortgageAmortization       `json:"amortization"`
	Snapshot      MortgageSnapshot           `json:"snapshot"`
	Summary       []PropertyPlannerSummary   `json:"summary"`
	Timeline      []PropertyPlannerTimeline  `json:"timeline"`
	Milestones    []PropertyPlannerMilestone `json:"milestones"`
	Insights      []PropertyPlannerInsight   `json:"insights"`
	UpdatedAt     time.Time                  `json:"updatedAt"`
}

type MortgageInputs struct {
	LoanAmount      float64 `json:"loanAmount"`
	LoanTermYears   int     `json:"loanTermYears"`
	BorrowerType    string  `json:"borrowerType"`
	LoanStartMonth  string  `json:"loanStartMonth"`
	FixedYears      int     `json:"fixedYears"`
	FixedRate       float64 `json:"fixedRate"`
	FloatingRate    float64 `json:"floatingRate"`
	HouseholdIncome float64 `json:"householdIncome"`
	OtherDebt       float64 `json:"otherDebt"`
}

type MortgageSnapshot struct {
	MonthlyPayment float64 `json:"monthlyPayment"`
	TotalInterest  float64 `json:"totalInterest"`
	LoanEndDate    string  `json:"loanEndDate"`
	MSRRatio       float64 `json:"msrRatio"`
}

type MortgageAmortization struct {
	BalancePoints []MortgageBalancePoint     `json:"balancePoints"`
	Composition   []MortgageCompositionPoint `json:"composition"`
}

type MortgageBalancePoint struct {
	Label     string  `json:"label"`
	Balance   float64 `json:"balance"`
	Year      int     `json:"year"`
	YearIndex int     `json:"yearIndex"`
}

type MortgageCompositionPoint struct {
	Label     string  `json:"label"`
	Interest  float64 `json:"interest"`
	Principal float64 `json:"principal"`
	Year      int     `json:"year"`
	YearIndex int     `json:"yearIndex"`
}

type PropertyPlannerSummary struct {
	ID       string  `json:"id"`
	Label    string  `json:"label"`
	Value    float64 `json:"value"`
	Helper   string  `json:"helper"`
	Emphasis string  `json:"emphasis,omitempty"`
}

type PropertyPlannerTimeline struct {
	ID          string  `json:"id"`
	Year        int     `json:"year"`
	Label       string  `json:"label"`
	CashOutlay  float64 `json:"cashOutlay"`
	CPFUsage    float64 `json:"cpfUsage"`
	LoanBalance float64 `json:"loanBalance"`
	Valuation   float64 `json:"valuation"`
}

type PropertyPlannerMilestone struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Timeframe   string `json:"timeframe"`
	Tone        string `json:"tone,omitempty"`
}

type PropertyPlannerInsight struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Detail string `json:"detail"`
	Tone   string `json:"tone"`
}

// SeedData is a convenience structure for populating demo repositories.
type SeedData struct {
	Assets            []Asset
	Liabilities       []Liability
	Incomes           []Income
	Expenses          []Expense
	PropertyScenarios []PropertyPlannerScenario
}
