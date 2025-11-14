import type {
  MortgageAmortization,
  MortgageInputs,
  MortgageSnapshot,
} from "@/lib/financial/types";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const MONTHS_IN_YEAR = 12;

export function buildMortgageScenario(inputs: MortgageInputs): {
  amortization: MortgageAmortization;
  snapshot: MortgageSnapshot;
} {
  const totalMonths = inputs.loanTermYears * MONTHS_IN_YEAR;
  const monthlyRate = inputs.fixedRate / 100 / MONTHS_IN_YEAR;

  const monthlyPayment =
    monthlyRate === 0
      ? inputs.loanAmount / totalMonths
      : (inputs.loanAmount * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -totalMonths));

  const totalInterest = monthlyPayment * totalMonths - inputs.loanAmount;
  const loanStartYear = getLoanStartYear(inputs.loanStartMonth);
  const amortization = buildAmortizationData({
    loanAmount: inputs.loanAmount,
    monthlyPayment,
    monthlyRate,
    loanTermYears: inputs.loanTermYears,
    totalMonths,
    loanStartYear,
  });

  const loanEndDate = computeLoanEndDate(
    inputs.loanStartMonth,
    inputs.loanTermYears
  );

  const msrRatio = inputs.householdIncome
    ? clamp(monthlyPayment / inputs.householdIncome, 0, 1.5)
    : 0;

  return {
    amortization,
    snapshot: {
      monthlyPayment,
      totalInterest,
      loanEndDate,
      msrRatio,
    },
  };
}

export function buildAmortizationData({
  loanAmount,
  monthlyPayment,
  monthlyRate,
  loanTermYears,
  totalMonths,
  loanStartYear,
}: {
  loanAmount: number;
  monthlyPayment: number;
  monthlyRate: number;
  loanTermYears: number;
  totalMonths: number;
  loanStartYear: number;
}): MortgageAmortization {
  if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) {
    return { balancePoints: [], composition: [] };
  }

  const balancePoints: MortgageAmortization["balancePoints"] = [];
  const composition: MortgageAmortization["composition"] = [];
  let remaining = loanAmount;
  let interestAcc = 0;
  let principalAcc = 0;

  for (let month = 1; month <= totalMonths; month += 1) {
    const interest = monthlyRate > 0 ? remaining * monthlyRate : 0;
    let principal = monthlyPayment - interest;
    if (principal < 0) {
      principal = 0;
    }
    if (principal > remaining) {
      principal = remaining;
    }
    remaining = Math.max(remaining - principal, 0);
    interestAcc += interest;
    principalAcc += principal;

    const atYearBoundary = month % MONTHS_IN_YEAR === 0 || month === totalMonths;
    if (atYearBoundary) {
      const yearIndex = Math.ceil(month / MONTHS_IN_YEAR);
      const year = loanStartYear + yearIndex - 1;
      balancePoints.push({
        label: `Year ${yearIndex}`,
        balance: Math.round(remaining),
        year,
        yearIndex,
      });
      composition.push({
        label: `Year ${yearIndex}`,
        interest: Math.round(interestAcc),
        principal: Math.round(principalAcc),
        year,
        yearIndex,
      });
      interestAcc = 0;
      principalAcc = 0;
    }

    if (remaining <= 0) {
      break;
    }
  }

  if (balancePoints.length === 0) {
    balancePoints.push({
      label: "Year 1",
      balance: Math.round(remaining),
      year: loanStartYear,
      yearIndex: 1,
    });
  }

  if (composition.length === 0) {
    composition.push({
      label: "Year 1",
      interest: Math.round(loanAmount * monthlyRate * MONTHS_IN_YEAR),
      principal: Math.round(monthlyPayment * MONTHS_IN_YEAR),
      year: loanStartYear,
      yearIndex: 1,
    });
  }

  return { balancePoints, composition };
}

function getLoanStartYear(loanStartMonth: string) {
  const [yearPart] = loanStartMonth.split("-");
  const parsed = Number(yearPart);
  return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
}

function computeLoanEndDate(
  loanStartMonth: string,
  loanTermYears: number
): string {
  if (!loanStartMonth) {
    return "—";
  }
  const [year, month] = loanStartMonth.split("-").map(Number);
  if (!year || !month) return "—";
  const end = new Date(year, month - 1 + loanTermYears * 12, 1);
  return end.toLocaleString("en-SG", { month: "short", year: "numeric" });
}
