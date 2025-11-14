CREATE TABLE IF NOT EXISTS property_planner_scenarios (
    id uuid PRIMARY KEY,
    property_type text NOT NULL,
    headline text NOT NULL,
    subheadline text NOT NULL DEFAULT '',
    last_refreshed text NOT NULL DEFAULT '',
    loan_inputs jsonb NOT NULL,
    amortization jsonb NOT NULL,
    snapshot jsonb NOT NULL,
    summary jsonb NOT NULL,
    timeline jsonb NOT NULL,
    milestones jsonb NOT NULL,
    insights jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS property_planner_scenarios_type_idx
ON property_planner_scenarios(property_type);
