package finance

import "time"

// DefaultSeedData returns demo-friendly finance entities for local dev/test.
func DefaultSeedData(now time.Time) SeedData {
	return SeedData{
		Assets: []Asset{
			{
				ID:               "asset-brokerage",
				Name:             "Total Market Index",
				Category:         "brokerage",
				CurrentValue:     185000,
				AnnualGrowthRate: 0.06,
				UpdatedAt:        now,
			},
			{
				ID:               "asset-cash",
				Name:             "Emergency Fund",
				Category:         "cash",
				CurrentValue:     25000,
				AnnualGrowthRate: 0.015,
				UpdatedAt:        now,
			},
			{
				ID:               "asset-401k",
				Name:             "401k - Employer",
				Category:         "retirement",
				CurrentValue:     320000,
				AnnualGrowthRate: 0.07,
				UpdatedAt:        now,
			},
		},
		Liabilities: []Liability{
			{
				ID:              "liability-mortgage",
				Name:            "Primary Mortgage",
				Category:        "mortgage",
				CurrentBalance:  415000,
				InterestRateAPR: 0.0475,
				MinimumPayment:  2600,
				UpdatedAt:       now,
			},
			{
				ID:              "liability-auto",
				Name:            "Auto Loan",
				Category:        "auto",
				CurrentBalance:  18000,
				InterestRateAPR: 0.0325,
				MinimumPayment:  410,
				UpdatedAt:       now,
			},
			{
				ID:              "liability-card",
				Name:            "Rewards Card",
				Category:        "credit_card",
				CurrentBalance:  3500,
				InterestRateAPR: 0.1999,
				MinimumPayment:  120,
				UpdatedAt:       now,
			},
		},
		Incomes: []Income{
			{
				ID:        "income-salary",
				Source:    "Product Manager Salary",
				Category:  "salary",
				Amount:    9600,
				Frequency: FrequencyMonthly,
				StartDate: now.AddDate(-2, 0, 0),
				UpdatedAt: now,
			},
			{
				ID:        "income-partner",
				Source:    "Partner Salary",
				Category:  "salary",
				Amount:    7800,
				Frequency: FrequencyMonthly,
				StartDate: now.AddDate(-1, -6, 0),
				UpdatedAt: now,
			},
			{
				ID:        "income-bonus",
				Source:    "Annual Bonus",
				Category:  "bonus",
				Amount:    18000,
				Frequency: FrequencyYearly,
				StartDate: now.AddDate(-4, 0, 0),
				UpdatedAt: now,
			},
			{
				ID:        "income-side",
				Source:    "Freelance Design",
				Category:  "side_hustle",
				Amount:    500,
				Frequency: FrequencyBiWeekly,
				StartDate: now.AddDate(0, -8, 0),
				UpdatedAt: now,
			},
		},
		Expenses: []Expense{
			{
				ID:        "expense-groceries",
				Payee:     "Groceries",
				Category:  "living",
				Amount:    750,
				Frequency: FrequencyMonthly,
				UpdatedAt: now,
			},
			{
				ID:        "expense-childcare",
				Payee:     "Childcare",
				Category:  "family",
				Amount:    1200,
				Frequency: FrequencyMonthly,
				UpdatedAt: now,
			},
			{
				ID:        "expense-insurance",
				Payee:     "Home Insurance",
				Category:  "insurance",
				Amount:    1500,
				Frequency: FrequencyYearly,
				UpdatedAt: now,
			},
			{
				ID:        "expense-travel",
				Payee:     "Travel Fund",
				Category:  "discretionary",
				Amount:    650,
				Frequency: FrequencyMonthly,
				UpdatedAt: now,
			},
			{
				ID:        "expense-dining",
				Payee:     "Dining Out",
				Category:  "discretionary",
				Amount:    250,
				Frequency: FrequencyWeekly,
				UpdatedAt: now,
			},
		},
	}
}
