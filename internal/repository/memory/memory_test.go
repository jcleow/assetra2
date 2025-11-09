package memory

import (
	"context"
	"testing"
	"time"

	"github.com/jcleow/assetra2/internal/finance"
	"github.com/jcleow/assetra2/internal/repository"
)

func TestAssetStoreCRUD(t *testing.T) {
	ctx := context.Background()
	now := time.Now().UTC()
	seed := finance.SeedData{
		Assets: []finance.Asset{
			{ID: "asset-1", Name: "Brokerage", Category: "investments", CurrentValue: 1000, UpdatedAt: now},
		},
	}

	repo := NewRepository(seed)
	store := repo.Assets()

	assets, err := store.List(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(assets) != 1 {
		t.Fatalf("expected 1 asset, got %d", len(assets))
	}

	created, err := store.Create(ctx, finance.Asset{
		Name:         "Cash",
		Category:     "cash",
		CurrentValue: 5000,
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if created.ID == "" {
		t.Fatal("expected created asset to have ID")
	}

	created.CurrentValue = 6000
	updated, err := store.Update(ctx, created)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.CurrentValue != 6000 {
		t.Fatalf("expected updated value 6000, got %.2f", updated.CurrentValue)
	}
	if updated.UpdatedAt.IsZero() {
		t.Fatal("expected updated timestamp to be set")
	}

	if err := store.Delete(ctx, created.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if err := store.Delete(ctx, "missing"); err != repository.ErrNotFound {
		t.Fatalf("expected ErrNotFound deleting missing asset, got %v", err)
	}
}

func TestIncomeValidations(t *testing.T) {
	ctx := context.Background()
	repo := NewRepository(finance.SeedData{})
	store := repo.Incomes()

	if _, err := store.Create(ctx, finance.Income{Source: "", Amount: 500}); err != repository.ErrInvalidInput {
		t.Fatalf("expected invalid input when source empty, got %v", err)
	}
	if _, err := store.Create(ctx, finance.Income{Source: "Part-time", Amount: 0}); err != repository.ErrInvalidInput {
		t.Fatalf("expected invalid input when amount zero, got %v", err)
	}

	created, err := store.Create(ctx, finance.Income{
		Source:    "Consulting",
		Amount:    1500,
		Frequency: finance.FrequencyMonthly,
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	if err := store.Delete(ctx, created.ID); err != nil {
		t.Fatalf("delete existing: %v", err)
	}
	if err := store.Delete(ctx, created.ID); err != repository.ErrNotFound {
		t.Fatalf("expected ErrNotFound deleting twice, got %v", err)
	}
}

func TestExpenseValidations(t *testing.T) {
	ctx := context.Background()
	repo := NewRepository(finance.SeedData{})
	store := repo.Expenses()

	if _, err := store.Create(ctx, finance.Expense{Payee: "", Amount: 100}); err != repository.ErrInvalidInput {
		t.Fatalf("expected invalid input, got %v", err)
	}
	if _, err := store.Create(ctx, finance.Expense{Payee: "Coffee", Amount: 0}); err != repository.ErrInvalidInput {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestLiabilityUpdateRequiresExistingRecord(t *testing.T) {
	ctx := context.Background()
	repo := NewRepository(finance.SeedData{})
	store := repo.Liabilities()

	_, err := store.Update(ctx, finance.Liability{ID: "missing", Name: "Car"})
	if err != repository.ErrNotFound {
		t.Fatalf("expected ErrNotFound updating missing record, got %v", err)
	}

	created, err := store.Create(ctx, finance.Liability{
		Name:           "Loan",
		Category:       "auto",
		CurrentBalance: 12000,
	})
	if err != nil {
		t.Fatalf("create liability: %v", err)
	}

	created.CurrentBalance = 9000
	if _, err := store.Update(ctx, created); err != nil {
		t.Fatalf("update existing: %v", err)
	}
}
