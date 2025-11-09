package memory

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"github.com/jcleow/assetra2/internal/finance"
	"github.com/jcleow/assetra2/internal/repository"
)

// NewRepository wires an in-memory repository populated with optional seed data.
func NewRepository(seed finance.SeedData) repository.Repository {
	return &inMemoryRepository{
		assets:      newAssetStore(seed.Assets),
		liabilities: newLiabilityStore(seed.Liabilities),
		incomes:     newIncomeStore(seed.Incomes),
		expenses:    newExpenseStore(seed.Expenses),
	}
}

type inMemoryRepository struct {
	assets      *assetStore
	liabilities *liabilityStore
	incomes     *incomeStore
	expenses    *expenseStore
}

func (r *inMemoryRepository) Assets() repository.AssetStore {
	return r.assets
}

func (r *inMemoryRepository) Liabilities() repository.LiabilityStore {
	return r.liabilities
}

func (r *inMemoryRepository) Incomes() repository.IncomeStore {
	return r.incomes
}

func (r *inMemoryRepository) Expenses() repository.ExpenseStore {
	return r.expenses
}

// --- asset store ---

type assetStore struct {
	mu    sync.RWMutex
	items map[string]finance.Asset
}

func newAssetStore(seed []finance.Asset) *assetStore {
	store := &assetStore{
		items: make(map[string]finance.Asset),
	}
	for _, asset := range seed {
		store.items[asset.ID] = asset
	}
	return store
}

func (s *assetStore) List(_ context.Context) ([]finance.Asset, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]finance.Asset, 0, len(s.items))
	for _, asset := range s.items {
		out = append(out, asset)
	}
	return out, nil
}

func (s *assetStore) Get(_ context.Context, id string) (finance.Asset, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	asset, ok := s.items[id]
	if !ok {
		return finance.Asset{}, repository.ErrNotFound
	}
	return asset, nil
}

func (s *assetStore) Create(_ context.Context, asset finance.Asset) (finance.Asset, error) {
	if asset.Name == "" {
		return finance.Asset{}, repository.ErrInvalidInput
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	asset.ID = ensureID(asset.ID)
	asset.UpdatedAt = time.Now().UTC()
	s.items[asset.ID] = asset
	return asset, nil
}

func (s *assetStore) Update(_ context.Context, asset finance.Asset) (finance.Asset, error) {
	if asset.ID == "" {
		return finance.Asset{}, repository.ErrInvalidInput
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[asset.ID]; !ok {
		return finance.Asset{}, repository.ErrNotFound
	}
	asset.UpdatedAt = time.Now().UTC()
	s.items[asset.ID] = asset
	return asset, nil
}

func (s *assetStore) Delete(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[id]; !ok {
		return repository.ErrNotFound
	}
	delete(s.items, id)
	return nil
}

// --- liability store ---

type liabilityStore struct {
	mu    sync.RWMutex
	items map[string]finance.Liability
}

func newLiabilityStore(seed []finance.Liability) *liabilityStore {
	store := &liabilityStore{
		items: make(map[string]finance.Liability),
	}
	for _, liability := range seed {
		store.items[liability.ID] = liability
	}
	return store
}

func (s *liabilityStore) List(_ context.Context) ([]finance.Liability, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]finance.Liability, 0, len(s.items))
	for _, liability := range s.items {
		out = append(out, liability)
	}
	return out, nil
}

func (s *liabilityStore) Get(_ context.Context, id string) (finance.Liability, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	item, ok := s.items[id]
	if !ok {
		return finance.Liability{}, repository.ErrNotFound
	}
	return item, nil
}

func (s *liabilityStore) Create(_ context.Context, liability finance.Liability) (finance.Liability, error) {
	if liability.Name == "" {
		return finance.Liability{}, repository.ErrInvalidInput
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	liability.ID = ensureID(liability.ID)
	liability.UpdatedAt = time.Now().UTC()
	s.items[liability.ID] = liability
	return liability, nil
}

func (s *liabilityStore) Update(_ context.Context, liability finance.Liability) (finance.Liability, error) {
	if liability.ID == "" {
		return finance.Liability{}, repository.ErrInvalidInput
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[liability.ID]; !ok {
		return finance.Liability{}, repository.ErrNotFound
	}
	liability.UpdatedAt = time.Now().UTC()
	s.items[liability.ID] = liability
	return liability, nil
}

func (s *liabilityStore) Delete(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[id]; !ok {
		return repository.ErrNotFound
	}
	delete(s.items, id)
	return nil
}

// --- income store ---

type incomeStore struct {
	mu    sync.RWMutex
	items map[string]finance.Income
}

func newIncomeStore(seed []finance.Income) *incomeStore {
	store := &incomeStore{
		items: make(map[string]finance.Income),
	}
	for _, income := range seed {
		store.items[income.ID] = income
	}
	return store
}

func (s *incomeStore) List(_ context.Context) ([]finance.Income, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]finance.Income, 0, len(s.items))
	for _, income := range s.items {
		out = append(out, income)
	}
	return out, nil
}

func (s *incomeStore) Get(_ context.Context, id string) (finance.Income, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	item, ok := s.items[id]
	if !ok {
		return finance.Income{}, repository.ErrNotFound
	}
	return item, nil
}

func (s *incomeStore) Create(_ context.Context, income finance.Income) (finance.Income, error) {
	if income.Source == "" || income.Amount <= 0 {
		return finance.Income{}, repository.ErrInvalidInput
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	income.ID = ensureID(income.ID)
	income.UpdatedAt = time.Now().UTC()
	s.items[income.ID] = income
	return income, nil
}

func (s *incomeStore) Update(_ context.Context, income finance.Income) (finance.Income, error) {
	if income.ID == "" {
		return finance.Income{}, repository.ErrInvalidInput
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[income.ID]; !ok {
		return finance.Income{}, repository.ErrNotFound
	}
	income.UpdatedAt = time.Now().UTC()
	s.items[income.ID] = income
	return income, nil
}

func (s *incomeStore) Delete(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[id]; !ok {
		return repository.ErrNotFound
	}
	delete(s.items, id)
	return nil
}

// --- expense store ---

type expenseStore struct {
	mu    sync.RWMutex
	items map[string]finance.Expense
}

func newExpenseStore(seed []finance.Expense) *expenseStore {
	store := &expenseStore{
		items: make(map[string]finance.Expense),
	}
	for _, expense := range seed {
		store.items[expense.ID] = expense
	}
	return store
}

func (s *expenseStore) List(_ context.Context) ([]finance.Expense, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]finance.Expense, 0, len(s.items))
	for _, expense := range s.items {
		out = append(out, expense)
	}
	return out, nil
}

func (s *expenseStore) Get(_ context.Context, id string) (finance.Expense, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	item, ok := s.items[id]
	if !ok {
		return finance.Expense{}, repository.ErrNotFound
	}
	return item, nil
}

func (s *expenseStore) Create(_ context.Context, expense finance.Expense) (finance.Expense, error) {
	if expense.Payee == "" || expense.Amount <= 0 {
		return finance.Expense{}, repository.ErrInvalidInput
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	expense.ID = ensureID(expense.ID)
	expense.UpdatedAt = time.Now().UTC()
	s.items[expense.ID] = expense
	return expense, nil
}

func (s *expenseStore) Update(_ context.Context, expense finance.Expense) (finance.Expense, error) {
	if expense.ID == "" {
		return finance.Expense{}, repository.ErrInvalidInput
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[expense.ID]; !ok {
		return finance.Expense{}, repository.ErrNotFound
	}
	expense.UpdatedAt = time.Now().UTC()
	s.items[expense.ID] = expense
	return expense, nil
}

func (s *expenseStore) Delete(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[id]; !ok {
		return repository.ErrNotFound
	}
	delete(s.items, id)
	return nil
}

func ensureID(id string) string {
	if id != "" {
		return id
	}
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		// Fallback to timestamp-based uniqueness if entropy fails.
		return "id-" + time.Now().UTC().Format("20060102150405.000000000")
	}
	return hex.EncodeToString(b[:])
}
