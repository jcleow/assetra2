package repository

import (
	"context"
	"errors"

	"github.com/jcleow/assetra2/internal/finance"
)

var (
	// ErrNotFound is returned when an entity cannot be located in the repository.
	ErrNotFound = errors.New("repository: not found")
	// ErrInvalidInput is returned when create/update payloads are malformed.
	ErrInvalidInput = errors.New("repository: invalid input")
)

// AssetStore defines CRUD operations for assets.
type AssetStore interface {
	List(ctx context.Context) ([]finance.Asset, error)
	Get(ctx context.Context, id string) (finance.Asset, error)
	Create(ctx context.Context, asset finance.Asset) (finance.Asset, error)
	Update(ctx context.Context, asset finance.Asset) (finance.Asset, error)
	Delete(ctx context.Context, id string) error
}

// LiabilityStore defines CRUD operations for liabilities.
type LiabilityStore interface {
	List(ctx context.Context) ([]finance.Liability, error)
	Get(ctx context.Context, id string) (finance.Liability, error)
	Create(ctx context.Context, liability finance.Liability) (finance.Liability, error)
	Update(ctx context.Context, liability finance.Liability) (finance.Liability, error)
	Delete(ctx context.Context, id string) error
}

// IncomeStore defines CRUD operations for incomes.
type IncomeStore interface {
	List(ctx context.Context) ([]finance.Income, error)
	Get(ctx context.Context, id string) (finance.Income, error)
	Create(ctx context.Context, income finance.Income) (finance.Income, error)
	Update(ctx context.Context, income finance.Income) (finance.Income, error)
	Delete(ctx context.Context, id string) error
}

// ExpenseStore defines CRUD operations for expenses.
type ExpenseStore interface {
	List(ctx context.Context) ([]finance.Expense, error)
	Get(ctx context.Context, id string) (finance.Expense, error)
	Create(ctx context.Context, expense finance.Expense) (finance.Expense, error)
	Update(ctx context.Context, expense finance.Expense) (finance.Expense, error)
	Delete(ctx context.Context, id string) error
}

// Repository aggregates typed stores for easier dependency injection.
type Repository interface {
	Assets() AssetStore
	Liabilities() LiabilityStore
	Incomes() IncomeStore
	Expenses() ExpenseStore
}
