export type PropertyPlannerType = "hdb" | "condo" | "landed";

export interface PropertyPlannerSummary {
  id: string;
  label: string;
  value: number;
  helper: string;
  emphasis?: string;
}

export interface PropertyPlannerTimelinePoint {
  id: string;
  year: number;
  label: string;
  cashOutlay: number;
  cpfUsage: number;
  loanBalance: number;
  valuation: number;
}

export interface PropertyPlannerMilestone {
  id: string;
  title: string;
  description: string;
  timeframe: string;
  tone?: "success" | "warning" | "info";
}

export interface PropertyPlannerInsight {
  id: string;
  title: string;
  detail: string;
  tone: "info" | "warning";
}

export interface PropertyPlannerScenario {
  type: PropertyPlannerType;
  headline: string;
  subheadline: string;
  lastRefreshed: string;
  summary: PropertyPlannerSummary[];
  timeline: PropertyPlannerTimelinePoint[];
  milestones: PropertyPlannerMilestone[];
  insights: PropertyPlannerInsight[];
}

const CURRENT_YEAR = new Date().getFullYear();

export const PROPERTY_TYPES: Array<{
  id: PropertyPlannerType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: "hdb",
    label: "HDB (BTO / Resale)",
    description: "Grants, MSR/TDSR guardrails, CPF-heavy funding",
    icon: "🏢",
  },
  {
    id: "condo",
    label: "Condo",
    description: "Private loan flexibility, ABSD/LTV tiers",
    icon: "🏙️",
  },
  {
    id: "landed",
    label: "Landed",
    description: "Land/reno reserves, staggered cash calls",
    icon: "🏡",
  },
];

export const PROPERTY_PLANNER_MOCKS: Record<
  PropertyPlannerType,
  PropertyPlannerScenario
> = {
  hdb: {
    type: "hdb",
    headline: "4-Room BTO in Tampines North",
    subheadline: "Ballot in 2025, key collection projected for mid-2028",
    lastRefreshed: "Sample data synced 2 days ago",
    summary: [
      {
        id: "cash",
        label: "Cash Buffer Needed",
        value: 58000,
        helper: "5% minimum cash + legal/renovation buffer",
        emphasis: "Includes S$12K reno reserve",
      },
      {
        id: "cpf",
        label: "CPF OA Utilised",
        value: 182000,
        helper: "After Enhanced Housing Grant and AHG",
      },
      {
        id: "loan",
        label: "HDB Loan Amount",
        value: 480000,
        helper: "25-year tenure at 2.60% p.a.",
      },
      {
        id: "valuation",
        label: "Year 10 Valuation",
        value: 620000,
        helper: "Assumes 2.1% annual appreciation",
      },
    ],
    timeline: [
      {
        id: "t0",
        year: CURRENT_YEAR,
        label: "Ballot & Option Fee",
        cashOutlay: 5000,
        cpfUsage: 0,
        loanBalance: 0,
        valuation: 0,
      },
      {
        id: "t1",
        year: CURRENT_YEAR + 1,
        label: "Down Payment (5% cash + CPF)",
        cashOutlay: 23000,
        cpfUsage: 54000,
        loanBalance: 480000,
        valuation: 560000,
      },
      {
        id: "t2",
        year: CURRENT_YEAR + 3,
        label: "Progressive Payment & Key Collection",
        cashOutlay: 18000,
        cpfUsage: 45000,
        loanBalance: 462000,
        valuation: 575000,
      },
      {
        id: "t3",
        year: CURRENT_YEAR + 5,
        label: "Stabilised Mortgage Year 2",
        cashOutlay: 24000,
        cpfUsage: 12000,
        loanBalance: 420000,
        valuation: 598000,
      },
      {
        id: "t4",
        year: CURRENT_YEAR + 10,
        label: "Year 10 Outlook",
        cashOutlay: 24000,
        cpfUsage: 12000,
        loanBalance: 325000,
        valuation: 620000,
      },
    ],
    milestones: [
      {
        id: "m0",
        title: "Ballot submission",
        description: "Submit BTO ballot with 2-room flexi grant declaration",
        timeframe: "Q3 " + CURRENT_YEAR,
        tone: "info",
      },
      {
        id: "m1",
        title: "Key collection buffer",
        description: "Ensure S$30K cash buffer ahead of key collection (2028)",
        timeframe: "Q2 " + (CURRENT_YEAR + 3),
        tone: "warning",
      },
      {
        id: "m2",
        title: "CPF replenishment",
        description: "Top-up OA by S$12K/year to stay on track for retirement",
        timeframe: "Annual",
        tone: "success",
      },
    ],
    insights: [
      {
        id: "i0",
        title: "MSR remains safe",
        detail: "Projected mortgage is 26% of income, below the 30% MSR limit.",
        tone: "info",
      },
      {
        id: "i1",
        title: "CPF dip in 2028",
        detail:
          "OA balance drops to S$8K at key collection. Recommend replenishing within 18 months.",
        tone: "warning",
      },
    ],
  },
  condo: {
    type: "condo",
    headline: "2-Bedroom Condo in Queenstown",
    subheadline: "Immediate resale purchase with bank loan structure",
    lastRefreshed: "Sample data synced this week",
    summary: [
      {
        id: "cash",
        label: "Cash Needed",
        value: 168000,
        helper: "25% down payment + ABSD (0%) + fees",
        emphasis: "Includes 3% buyer stamp duty",
      },
      {
        id: "cpf",
        label: "CPF OA Utilised",
        value: 220000,
        helper: "After preserving 6 months of mortgage payments",
      },
      {
        id: "loan",
        label: "Bank Loan Amount",
        value: 660000,
        helper: "30-year tenure, 3.9% floating",
      },
      {
        id: "valuation",
        label: "Year 10 Valuation",
        value: 900000,
        helper: "Assumes 2.8% annual appreciation",
      },
    ],
    timeline: [
      {
        id: "c0",
        year: CURRENT_YEAR,
        label: "Option to Purchase",
        cashOutlay: 10000,
        cpfUsage: 0,
        loanBalance: 0,
        valuation: 0,
      },
      {
        id: "c1",
        year: CURRENT_YEAR,
        label: "Completion & Renovation",
        cashOutlay: 158000,
        cpfUsage: 180000,
        loanBalance: 660000,
        valuation: 820000,
      },
      {
        id: "c2",
        year: CURRENT_YEAR + 1,
        label: "Stabilised Mortgage Year 1",
        cashOutlay: 42000,
        cpfUsage: 18000,
        loanBalance: 645000,
        valuation: 838000,
      },
      {
        id: "c3",
        year: CURRENT_YEAR + 5,
        label: "Interest Rate Reset",
        cashOutlay: 45000,
        cpfUsage: 20000,
        loanBalance: 575000,
        valuation: 870000,
      },
      {
        id: "c4",
        year: CURRENT_YEAR + 10,
        label: "Year 10 Outlook",
        cashOutlay: 45000,
        cpfUsage: 20000,
        loanBalance: 430000,
        valuation: 900000,
      },
    ],
    milestones: [
      {
        id: "cm0",
        title: "Loan approval in-principle",
        description: "Secure IPA before placing OTP to lock 75% LTV.",
        timeframe: "This month",
        tone: "info",
      },
      {
        id: "cm1",
        title: "Refinance checkpoint",
        description: "Fixed rate ends in Year 3. Plan refinancing to avoid jump.",
        timeframe: "Year " + (CURRENT_YEAR + 3),
        tone: "warning",
      },
      {
        id: "cm2",
        title: "Rental offset opportunity",
        description: "Queenstown rent covers ~65% of mortgage at $4.1K/month.",
        timeframe: "Optional from Year 2",
        tone: "success",
      },
    ],
    insights: [
      {
        id: "ci0",
        title: "ABSD neutral",
        detail:
          "First property purchase keeps ABSD at 0%, freeing cash for reno.",
        tone: "info",
      },
      {
        id: "ci1",
        title: "Maintenance sensitivity",
        detail:
          "Condo maintenance ($420/month) drives $5K/year cash burn if renting doesn't happen.",
        tone: "warning",
      },
    ],
  },
  landed: {
    type: "landed",
    headline: "99-year Terrace in Serangoon",
    subheadline: "Major renovation to add attic and solar upgrades",
    lastRefreshed: "Sample data synced 5 days ago",
    summary: [
      {
        id: "cash",
        label: "Cash Needed",
        value: 420000,
        helper: "Includes 55% down payment due to 2nd property ABSD",
        emphasis: "ABSD rebate assumed after selling flat",
      },
      {
        id: "cpf",
        label: "CPF OA Utilised",
        value: 300000,
        helper: "After reserving emergency buffers",
      },
      {
        id: "loan",
        label: "Bank Loan Amount",
        value: 780000,
        helper: "23-year tenure at 4.1% p.a.",
      },
      {
        id: "valuation",
        label: "Year 10 Valuation",
        value: 1_650_000,
        helper: "Assumes 3.2% annual appreciation",
      },
    ],
    timeline: [
      {
        id: "l0",
        year: CURRENT_YEAR,
        label: "Option & Exercise",
        cashOutlay: 120000,
        cpfUsage: 75000,
        loanBalance: 0,
        valuation: 0,
      },
      {
        id: "l1",
        year: CURRENT_YEAR,
        label: "Completion + Reno Deposit",
        cashOutlay: 220000,
        cpfUsage: 150000,
        loanBalance: 780000,
        valuation: 1_450_000,
      },
      {
        id: "l2",
        year: CURRENT_YEAR + 1,
        label: "Renovation Progress Payments",
        cashOutlay: 50000,
        cpfUsage: 20000,
        loanBalance: 760000,
        valuation: 1_520_000,
      },
      {
        id: "l3",
        year: CURRENT_YEAR + 5,
        label: "Stabilised Mortgage",
        cashOutlay: 72000,
        cpfUsage: 24000,
        loanBalance: 660000,
        valuation: 1_590_000,
      },
      {
        id: "l4",
        year: CURRENT_YEAR + 10,
        label: "Year 10 Outlook",
        cashOutlay: 72000,
        cpfUsage: 24000,
        loanBalance: 520000,
        valuation: 1_650_000,
      },
    ],
    milestones: [
      {
        id: "lm0",
        title: "Construction drawdown",
        description:
          "Ensure cash buffer for stage payments (foundation, structure, finishes).",
        timeframe: "Next 12 months",
        tone: "warning",
      },
      {
        id: "lm1",
        title: "ABSD refund clock",
        description: "Must sell current HDB within 6 months to reclaim ABSD.",
        timeframe: "Regulatory",
        tone: "warning",
      },
      {
        id: "lm2",
        title: "Solar offset",
        description: "Solar upgrade expected to shave $250/month off utilities.",
        timeframe: "After TOP",
        tone: "success",
      },
    ],
    insights: [
      {
        id: "li0",
        title: "Higher maintenance",
        detail:
          "Set aside $12K/year for upkeep (landscaping, facade, repairs).",
        tone: "warning",
      },
      {
        id: "li1",
        title: "Equity build-up",
        detail: "Equity crosses S$550K by Year 5 despite heavy cash usage.",
        tone: "info",
      },
    ],
  },
};
