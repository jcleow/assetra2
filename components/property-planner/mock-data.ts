import { buildMortgageScenario } from "./calculations";

import type {
  MortgageInputs,
  PropertyPlannerInsight,
  PropertyPlannerMilestone,
  PropertyPlannerScenario,
  PropertyPlannerSummary,
  PropertyPlannerTimelinePoint,
} from "@/lib/financial/types";

export type PropertyPlannerType = "hdb" | "condo" | "landed";

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_INPUTS: Record<PropertyPlannerType, MortgageInputs> = {
  hdb: {
    loanAmount: 750_000,
    loanTermYears: 25,
    borrowerType: "single",
    loanStartMonth: "2025-11",
    fixedYears: 5,
    fixedRate: 2.6,
    floatingRate: 4.1,
    householdIncome: 10_500,
    otherDebt: 0,
  },
  condo: {
    loanAmount: 1_050_000,
    loanTermYears: 30,
    borrowerType: "couple",
    loanStartMonth: "2025-07",
    fixedYears: 2,
    fixedRate: 3.1,
    floatingRate: 4.3,
    householdIncome: 18_000,
    otherDebt: 500,
  },
  landed: {
    loanAmount: 1_600_000,
    loanTermYears: 30,
    borrowerType: "couple",
    loanStartMonth: "2026-01",
    fixedYears: 3,
    fixedRate: 3.4,
    floatingRate: 4.6,
    householdIncome: 24_000,
    otherDebt: 1_800,
  },
};

type ScenarioSeed = {
  headline: string;
  subheadline: string;
  lastRefreshed: string;
  summary: PropertyPlannerSummary[];
  timeline: PropertyPlannerTimelinePoint[];
  milestones: PropertyPlannerMilestone[];
  insights: PropertyPlannerInsight[];
  inputs?: MortgageInputs;
};

function buildScenario(
  type: PropertyPlannerType,
  seed: ScenarioSeed
): PropertyPlannerScenario {
  const inputs = seed.inputs ?? DEFAULT_INPUTS[type];
  const { amortization, snapshot } = buildMortgageScenario(inputs);
  return {
    id: "",
    type,
    headline: seed.headline,
    subheadline: seed.subheadline,
    lastRefreshed: seed.lastRefreshed,
    inputs,
    amortization,
    snapshot,
    summary: seed.summary,
    timeline: seed.timeline,
    milestones: seed.milestones,
    insights: seed.insights,
    updatedAt: new Date().toISOString(),
  };
}

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
  hdb: buildScenario("hdb", {
    headline: "4-Room BTO in Tampines North",
    subheadline: "Ballot in 2025, key collection projected for mid-2028",
    lastRefreshed: "Sample data synced 2 days ago",
    summary: [
      {
        id: "cash",
        label: "Cash Buffer Needed",
        value: 58_000,
        helper: "5% minimum cash + legal/renovation buffer",
        emphasis: "Includes S$12K reno reserve",
      },
      {
        id: "cpf",
        label: "CPF OA Utilised",
        value: 182_000,
        helper: "After Enhanced Housing Grant and AHG",
      },
      {
        id: "loan",
        label: "HDB Loan Amount",
        value: 480_000,
        helper: "25-year tenure at 2.60% p.a.",
      },
      {
        id: "valuation",
        label: "Year 10 Valuation",
        value: 620_000,
        helper: "Assumes 2.1% annual appreciation",
      },
    ],
    timeline: [
      {
        id: "t0",
        year: CURRENT_YEAR,
        label: "Ballot & Option Fee",
        cashOutlay: 5_000,
        cpfUsage: 0,
        loanBalance: 0,
        valuation: 0,
      },
      {
        id: "t1",
        year: CURRENT_YEAR + 1,
        label: "Down Payment (5% cash + CPF)",
        cashOutlay: 23_000,
        cpfUsage: 54_000,
        loanBalance: 480_000,
        valuation: 560_000,
      },
      {
        id: "t2",
        year: CURRENT_YEAR + 3,
        label: "Progressive Payment & Key Collection",
        cashOutlay: 18_000,
        cpfUsage: 45_000,
        loanBalance: 462_000,
        valuation: 575_000,
      },
      {
        id: "t3",
        year: CURRENT_YEAR + 5,
        label: "Stabilised Mortgage Year 2",
        cashOutlay: 24_000,
        cpfUsage: 12_000,
        loanBalance: 420_000,
        valuation: 598_000,
      },
      {
        id: "t4",
        year: CURRENT_YEAR + 10,
        label: "Year 10 Outlook",
        cashOutlay: 24_000,
        cpfUsage: 12_000,
        loanBalance: 325_000,
        valuation: 620_000,
      },
    ],
    milestones: [
      {
        id: "m0",
        title: "Ballot submission",
        description: "Submit BTO ballot with 2-room flexi grant declaration",
        timeframe: `Q3 ${CURRENT_YEAR}`,
        tone: "info",
      },
      {
        id: "m1",
        title: "Key collection buffer",
        description: "Ensure S$30K cash buffer ahead of key collection (2028)",
        timeframe: `Q2 ${CURRENT_YEAR + 3}`,
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
  }),
  condo: buildScenario("condo", {
    headline: "2-Bedroom Condo in Queenstown",
    subheadline: "Immediate resale purchase with bank loan structure",
    lastRefreshed: "Scenario synced yesterday",
    summary: [
      {
        id: "cash",
        label: "Cash Buffer Needed",
        value: 120_000,
        helper: "25% down payment + taxes + reno buffer",
      },
      {
        id: "loan",
        label: "Bank Loan Amount",
        value: 1_050_000,
        helper: "30-year tenure at blended 3.4%",
      },
      {
        id: "stamp",
        label: "Buyer Stamp Duty",
        value: 52_600,
        helper: "ABSD exempt (owner-occupied)",
      },
      {
        id: "cashflow",
        label: "Monthly Cashflow Impact",
        value: 5_800,
        helper: "Mortgage + fees after rental offset",
      },
    ],
    timeline: [
      {
        id: "t0",
        year: CURRENT_YEAR,
        label: "Offer Accepted",
        cashOutlay: 40_000,
        cpfUsage: 60_000,
        loanBalance: 0,
        valuation: 0,
      },
      {
        id: "t1",
        year: CURRENT_YEAR,
        label: "Completion",
        cashOutlay: 80_000,
        cpfUsage: 120_000,
        loanBalance: 1_050_000,
        valuation: 1_200_000,
      },
      {
        id: "t2",
        year: CURRENT_YEAR + 5,
        label: "Stabilised Rental Yield",
        cashOutlay: 20_000,
        cpfUsage: 24_000,
        loanBalance: 920_000,
        valuation: 1_320_000,
      },
      {
        id: "t3",
        year: CURRENT_YEAR + 10,
        label: "Year 10 Projection",
        cashOutlay: 24_000,
        cpfUsage: 24_000,
        loanBalance: 770_000,
        valuation: 1_460_000,
      },
    ],
    milestones: [
      {
        id: "m3",
        title: "ABSD remission filing",
        description: "Submit within 2 weeks of completion to recover 20%",
        timeframe: "Within 14 days of completion",
        tone: "warning",
      },
      {
        id: "m4",
        title: "Rental onboarding",
        description: "Line up tenant search 2 months before TOP",
        timeframe: "Q4 " + CURRENT_YEAR,
        tone: "info",
      },
    ],
    insights: [
      {
        id: "i2",
        title: "Rental offsets 60% of mortgage",
        detail: "At $4,500 monthly rent, cashflow impact drops by 60%.",
        tone: "info",
      },
      {
        id: "i3",
        title: "Cash buffer tight",
        detail:
          "Maintain S$40K reserve post-renovation to handle interest shocks.",
        tone: "warning",
      },
    ],
  }),
  landed: buildScenario("landed", {
    headline: "99-year Terrace in Serangoon",
    subheadline: "Major renovation to add attic and solar upgrades",
    lastRefreshed: "Scenario synced last week",
    summary: [
      {
        id: "cash",
        label: "Cash Needed",
        value: 300_000,
        helper: "Includes ABSD, BSD, and renovation tranche",
      },
      {
        id: "reno",
        label: "Renovation Budget",
        value: 250_000,
        helper: "Attic build + solar array installation",
      },
      {
        id: "loan",
        label: "Bank Loan",
        value: 1_600_000,
        helper: "Blended rate assumption at 3.6%",
      },
      {
        id: "maint",
        label: "Upkeep Allocation",
        value: 1_200,
        helper: "Monthly allowance for maintenance fund",
      },
    ],
    timeline: [
      {
        id: "t0",
        year: CURRENT_YEAR,
        label: "Option Fee",
        cashOutlay: 60_000,
        cpfUsage: 0,
        loanBalance: 0,
        valuation: 0,
      },
      {
        id: "t1",
        year: CURRENT_YEAR,
        label: "Completion + ABSD",
        cashOutlay: 220_000,
        cpfUsage: 120_000,
        loanBalance: 1_600_000,
        valuation: 1_950_000,
      },
      {
        id: "t2",
        year: CURRENT_YEAR + 1,
        label: "Renovation drawdown",
        cashOutlay: 250_000,
        cpfUsage: 0,
        loanBalance: 1_650_000,
        valuation: 2_150_000,
      },
      {
        id: "t3",
        year: CURRENT_YEAR + 5,
        label: "Stabilised Outlook",
        cashOutlay: 36_000,
        cpfUsage: 12_000,
        loanBalance: 1_420_000,
        valuation: 2_350_000,
      },
    ],
    milestones: [
      {
        id: "m5",
        title: "ABSD remission",
        description: "Plan sale of current HDB within 6 months to recover ABSD",
        timeframe: "6 months",
        tone: "warning",
      },
      {
        id: "m6",
        title: "Solar installation",
        description: "Coordinate SEGS rebate application before Q4",
        timeframe: "Q4 " + CURRENT_YEAR,
        tone: "info",
      },
    ],
    insights: [
      {
        id: "i4",
        title: "Upkeep buffer crucial",
        detail:
          "Set aside at least $1.2k/month for maintenance due to larger footprint.",
        tone: "warning",
      },
      {
        id: "i5",
        title: "Capital appreciation runway",
        detail:
          "Projected valuation crosses $2.3M by Year 5 with ongoing reno uplift.",
        tone: "info",
      },
    ],
  }),
};
