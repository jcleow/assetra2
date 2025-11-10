CREATE TABLE IF NOT EXISTS finance_assets (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL,
    current_value double precision NOT NULL,
    annual_growth_rate double precision NOT NULL DEFAULT 0,
    notes text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_liabilities (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL,
    current_balance double precision NOT NULL,
    interest_rate_apr double precision NOT NULL DEFAULT 0,
    minimum_payment double precision NOT NULL DEFAULT 0,
    notes text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_incomes (
    id uuid PRIMARY KEY,
    source text NOT NULL,
    amount double precision NOT NULL,
    frequency text NOT NULL,
    start_date timestamptz NOT NULL,
    category text NOT NULL,
    notes text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_expenses (
    id uuid PRIMARY KEY,
    payee text NOT NULL,
    amount double precision NOT NULL,
    frequency text NOT NULL,
    category text NOT NULL,
    notes text,
    updated_at timestamptz NOT NULL DEFAULT now()
);
