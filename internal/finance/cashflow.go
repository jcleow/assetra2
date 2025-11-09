package finance

import (
	"math"
)

// MonthlyAmount converts an income entry to a monthly value.
func (i Income) MonthlyAmount() float64 {
	return i.Amount * i.Frequency.monthlyFactor()
}

// MonthlyAmount converts an expense entry to a monthly value.
func (e Expense) MonthlyAmount() float64 {
	return e.Amount * e.Frequency.monthlyFactor()
}

// MonthlyCashFlow computes aggregate income/expense totals keyed to monthly cadence.
func MonthlyCashFlow(incomes []Income, expenses []Expense) CashFlowSummary {
	var incomeTotal, expenseTotal float64

	for _, income := range incomes {
		incomeTotal += income.MonthlyAmount()
	}

	for _, expense := range expenses {
		expenseTotal += expense.MonthlyAmount()
	}

	incomeTotal = roundToCents(incomeTotal)
	expenseTotal = roundToCents(expenseTotal)

	return CashFlowSummary{
		MonthlyIncome:   incomeTotal,
		MonthlyExpenses: expenseTotal,
		NetMonthly:      roundToCents(incomeTotal - expenseTotal),
	}
}

func (f Frequency) monthlyFactor() float64 {
	switch f {
	case FrequencyWeekly:
		return 52.0 / 12.0
	case FrequencyBiWeekly:
		return 26.0 / 12.0
	case FrequencyQuarterly:
		return 1.0 / 3.0
	case FrequencyYearly:
		return 1.0 / 12.0
	case FrequencyMonthly:
		fallthrough
	default:
		return 1.0
	}
}

func roundToCents(value float64) float64 {
	return math.Round(value*100) / 100
}
