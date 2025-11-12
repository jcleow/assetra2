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
  age: number = 32 // Default age if not provided
): CPFContribution {
  const rates = getCPFRates(age);

  // CPF salary ceiling is $6,000 per month as of 2024
  const CPF_SALARY_CEILING = 6000;
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
  age: number = 32
): string {
  const rates = getCPFRates(age);
  const CPF_SALARY_CEILING = 6000;
  const contributableWage = Math.min(monthlySalary, CPF_SALARY_CEILING);

  if (monthlySalary > CPF_SALARY_CEILING) {
    return `Based on $${contributableWage.toLocaleString()} contributable wage (capped), age ${age}`;
  }

  return `Based on $${contributableWage.toLocaleString()} salary, age ${age}`;
}