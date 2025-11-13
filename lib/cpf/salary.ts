import { calculateCPFContribution, getCPFRates, getCPFSalaryCeiling } from "./calculator";

export type CPFSalaryInputType = "gross" | "net";

export interface CPFSalaryMetadata {
  inputType: CPFSalaryInputType;
  grossAmount: number;
  netAmount: number;
  cpfEmployeeAmount: number;
  cpfEmployerAmount: number;
  updatedAt: string;
}

const CPF_SALARY_METADATA_PREFIX = "CPF_SALARY_METADATA::";

export const DEFAULT_SALARY_AGE = 32;

export function encodeCPFSalaryMetadata(metadata: CPFSalaryMetadata): string {
  return `${CPF_SALARY_METADATA_PREFIX}${JSON.stringify(metadata)}`;
}

export function decodeCPFSalaryMetadata(notes?: string | null): CPFSalaryMetadata | null {
  if (!notes || !notes.startsWith(CPF_SALARY_METADATA_PREFIX)) {
    return null;
  }

  try {
    const payload = notes.slice(CPF_SALARY_METADATA_PREFIX.length);
    const parsed = JSON.parse(payload);
    return parsed as CPFSalaryMetadata;
  } catch (error) {
    console.error("Failed to parse CPF salary metadata:", error);
    return null;
  }
}

export function isSalaryIncomeRecord(
  name: string | undefined,
  category: string | undefined
): boolean {
  const normalized = `${name ?? ""} ${category ?? ""}`.toLowerCase();
  return normalized.includes("salary") || normalized.includes("employment");
}

export function normalizeSalaryAmount(
  amount: number,
  inputType: CPFSalaryInputType = "gross",
  age: number = DEFAULT_SALARY_AGE,
  referenceDate: Date = new Date()
) {
  const grossSalary =
    inputType === "net"
      ? deriveGrossFromNet(amount, age, referenceDate)
      : amount;

  const cpfContribution = calculateCPFContribution(grossSalary, age, referenceDate);
  const netSalary = grossSalary - cpfContribution.employeeAmount;

  return {
    grossSalary,
    netSalary,
    cpfContribution,
  };
}

export function deriveGrossFromNet(
  netSalary: number,
  age: number = DEFAULT_SALARY_AGE,
  referenceDate: Date = new Date()
): number {
  if (netSalary <= 0) {
    return 0;
  }

  const rates = getCPFRates(age);
  const salaryCeiling = getCPFSalaryCeiling(referenceDate);

  const candidateWithCeiling = netSalary + rates.employeeRate * salaryCeiling;
  if (candidateWithCeiling > salaryCeiling) {
    return candidateWithCeiling;
  }

  const withoutCeiling = netSalary / (1 - rates.employeeRate);
  return Math.min(withoutCeiling, salaryCeiling);
}
