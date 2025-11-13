/**
 * CPF Contribution Calculator for Singapore
 * Based on current CPF rates and age brackets as of 2024
 */

export interface CPFContribution {
  employeeAmount: number;
  employerAmount: number;
  totalAmount: number;
}

export interface CPFRates {
  employeeRate: number;
  employerRate: number;
  totalRate: number;
}

interface CPFSalaryCeilingRule {
  ceiling: number;
  effectiveDate: Date;
}

const CPF_SALARY_CEILING_SCHEDULE: CPFSalaryCeilingRule[] = [
  {
    ceiling: 8000,
    effectiveDate: new Date("2026-01-01T00:00:00+08:00"),
  },
  {
    ceiling: 7400,
    effectiveDate: new Date("2025-01-01T00:00:00+08:00"),
  },
];

const CPF_SALARY_CEILING_DEFAULT = 6000;

export function getCPFSalaryCeiling(referenceDate: Date = new Date()): number {
  for (const rule of CPF_SALARY_CEILING_SCHEDULE) {
    if (referenceDate >= rule.effectiveDate) {
      return rule.ceiling;
    }
  }
  return CPF_SALARY_CEILING_DEFAULT;
}

/**
 * Get CPF contribution rates based on age
 * Reference: CPF official rates as of 2024
 */
export function getCPFRates(age: number): CPFRates {
  // Standard rates for ages 35 and below, and 60-65
  if (age <= 35 || (age >= 60 && age <= 65)) {
    return {
      employeeRate: 0.20, // 20%
      employerRate: 0.17, // 17%
      totalRate: 0.37,    // 37%
    };
  }

  // Rates for ages 36-50
  if (age >= 36 && age <= 50) {
    return {
      employeeRate: 0.20, // 20%
      employerRate: 0.17, // 17%
      totalRate: 0.37,    // 37%
    };
  }

  // Rates for ages 51-55
  if (age >= 51 && age <= 55) {
    return {
      employeeRate: 0.20, // 20%
      employerRate: 0.15, // 15%
      totalRate: 0.35,    // 35%
    };
  }

  // Rates for ages 56-60
  if (age >= 56 && age <= 60) {
    return {
      employeeRate: 0.13, // 13%
      employerRate: 0.10, // 10%
      totalRate: 0.23,    // 23%
    };
  }

  // Ages above 65 have reduced rates
  if (age > 65) {
    return {
      employeeRate: 0.05, // 5%
      employerRate: 0.075, // 7.5%
      totalRate: 0.125,    // 12.5%
    };
  }

  // Default fallback (should not reach here)
  return {
    employeeRate: 0.20,
    employerRate: 0.17,
    totalRate: 0.37,
  };
}

/**
 * Calculate CPF contributions based on monthly salary and age
 */
export function calculateCPFContribution(
  monthlySalary: number,
  age: number = 32, // Default age if not provided
  referenceDate: Date = new Date()
): CPFContribution {
  const rates = getCPFRates(age);

  const CPF_SALARY_CEILING = getCPFSalaryCeiling(referenceDate);
  const contributableWage = Math.min(monthlySalary, CPF_SALARY_CEILING);

  const employeeAmount = Math.round(contributableWage * rates.employeeRate);
  const employerAmount = Math.round(contributableWage * rates.employerRate);
  const totalAmount = employeeAmount + employerAmount;

  return {
    employeeAmount,
    employerAmount,
    totalAmount,
  };
}

/**
 * Generate descriptive text for CPF contribution basis
 */
export function getCPFContributionDescription(
  monthlySalary: number,
  age: number = 32,
  referenceDate: Date = new Date()
): string {
  const CPF_SALARY_CEILING = getCPFSalaryCeiling(referenceDate);
  const contributableWage = Math.min(monthlySalary, CPF_SALARY_CEILING);

  if (monthlySalary > CPF_SALARY_CEILING) {
    return `Based on $${contributableWage.toLocaleString()} contributable wage (CPF salary ceiling), age ${age}`;
  }

  return `Based on $${contributableWage.toLocaleString()} salary, age ${age}`;
}
