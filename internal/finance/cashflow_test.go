package finance

import (
	"testing"
	"time"
)

func TestMonthlyCashFlow(t *testing.T) {
	now := time.Now()
	incomes := []Income{
		{ID: "i1", Source: "Salary", Amount: 8000, Frequency: FrequencyMonthly, UpdatedAt: now},
		{ID: "i2", Source: "Bonus", Amount: 12000, Frequency: FrequencyYearly, UpdatedAt: now},
		{ID: "i3", Source: "Side", Amount: 300, Frequency: FrequencyWeekly, UpdatedAt: now},
	}

	expenses := []Expense{
		{ID: "e1", Payee: "Rent", Amount: 2500, Frequency: FrequencyMonthly, UpdatedAt: now},
		{ID: "e2", Payee: "Insurance", Amount: 1200, Frequency: FrequencyYearly, UpdatedAt: now},
		{ID: "e3", Payee: "Dining", Amount: 200, Frequency: FrequencyWeekly, UpdatedAt: now},
	}

	summary := MonthlyCashFlow(incomes, expenses)

	if summary.MonthlyIncome != 10300 {
		t.Fatalf("expected monthly income 10300, got %.2f", summary.MonthlyIncome)
	}
	if summary.MonthlyExpenses != 3466.67 {
		t.Fatalf("expected monthly expenses 3466.67, got %.2f", summary.MonthlyExpenses)
	}
	if summary.NetMonthly != 6833.33 {
		t.Fatalf("expected net monthly 6833.33, got %.2f", summary.NetMonthly)
	}
}

func TestMonthlyAmountFrequencyConversion(t *testing.T) {
	cases := []struct {
		name      string
		frequency Frequency
		amount    float64
		expected  float64
	}{
		{"monthly", FrequencyMonthly, 1000, 1000},
		{"biweekly", FrequencyBiWeekly, 1000, 2166.67},
		{"weekly", FrequencyWeekly, 1000, 4333.33},
		{"quarterly", FrequencyQuarterly, 900, 300},
		{"yearly", FrequencyYearly, 1200, 100},
		{"unknown", Frequency(""), 500, 500},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			income := Income{Amount: tc.amount, Frequency: tc.frequency}
			got := roundToCents(income.MonthlyAmount())
			if got != tc.expected {
				t.Fatalf("expected %.2f, got %.2f", tc.expected, got)
			}
		})
	}
}
