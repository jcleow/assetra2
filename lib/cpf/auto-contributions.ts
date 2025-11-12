import { financialClient } from "@/lib/financial/client";
import type { ExpenseCreatePayload, IncomeCreatePayload } from "@/lib/financial/types";
import { calculateCPFContribution, getCPFContributionDescription } from "./calculator";

interface CPFAutoContributionParams {
  monthlySalary: number;
  age?: number;
  userAge?: number;
}

/**
 * Auto-create CPF contribution income and expense entries
 * when a salary income is added
 */
export async function createCPFContributions({
  monthlySalary,
  age = 32,
}: CPFAutoContributionParams) {
  const cpfCalculation = calculateCPFContribution(monthlySalary, age);
  const description = getCPFContributionDescription(monthlySalary, age);

  // Create CPF employer contribution as income
  const employerContribution: IncomeCreatePayload = {
    source: "CPF Employer Contribution",
    amount: cpfCalculation.employerAmount,
    frequency: "monthly",
    startDate: new Date().toISOString(),
    category: "government_benefit",
    notes: description,
  };

  // Create CPF employee contribution as expense
  const employeeContribution: ExpenseCreatePayload = {
    payee: "CPF Employee Contribution",
    amount: cpfCalculation.employeeAmount,
    frequency: "monthly",
    category: "tax_deduction",
    notes: description,
  };

  try {
    // Create both contributions in parallel
    const [employerResult, employeeResult] = await Promise.all([
      financialClient.incomes.create(employerContribution),
      financialClient.expenses.create(employeeContribution),
    ]);

    console.log("CPF contributions created:", {
      employer: employerResult,
      employee: employeeResult,
    });

    return {
      employerContribution: employerResult,
      employeeContribution: employeeResult,
      calculation: cpfCalculation,
    };
  } catch (error) {
    console.error("Failed to create CPF contributions:", error);
    throw error;
  }
}

/**
 * Check if CPF contributions already exist to avoid duplicates
 */
export async function checkExistingCPFContributions(): Promise<boolean> {
  try {
    const [incomes, expenses] = await Promise.all([
      financialClient.incomes.list(),
      financialClient.expenses.list(),
    ]);

    const hasCPFIncome = incomes.some(income =>
      income.source.toLowerCase().includes("cpf")
    );

    const hasCPFExpense = expenses.some(expense =>
      expense.payee.toLowerCase().includes("cpf")
    );

    return hasCPFIncome || hasCPFExpense;
  } catch (error) {
    console.error("Failed to check existing CPF contributions:", error);
    return false;
  }
}

/**
 * Update existing CPF contributions when salary changes
 */
export async function updateCPFContributions(
  newMonthlySalary: number,
  age: number = 32
) {
  try {
    const [incomes, expenses] = await Promise.all([
      financialClient.incomes.list(),
      financialClient.expenses.list(),
    ]);

    const cpfCalculation = calculateCPFContribution(newMonthlySalary, age);
    const description = getCPFContributionDescription(newMonthlySalary, age);

    // Find and update CPF income
    const cpfIncome = incomes.find(income =>
      income.source.toLowerCase().includes("cpf")
    );

    // Find and update CPF expense
    const cpfExpense = expenses.find(expense =>
      expense.payee.toLowerCase().includes("cpf")
    );

    const updatePromises = [];

    if (cpfIncome) {
      updatePromises.push(
        financialClient.incomes.update({
          id: cpfIncome.id,
          source: "CPF Employer Contribution",
          amount: cpfCalculation.employerAmount,
          frequency: "monthly",
          startDate: cpfIncome.startDate,
          category: "government_benefit",
          notes: description,
        })
      );
    }

    if (cpfExpense) {
      updatePromises.push(
        financialClient.expenses.update({
          id: cpfExpense.id,
          payee: "CPF Employee Contribution",
          amount: cpfCalculation.employeeAmount,
          frequency: "monthly",
          category: "tax_deduction",
          notes: description,
        })
      );
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log("CPF contributions updated for new salary:", newMonthlySalary);
    }

    return cpfCalculation;
  } catch (error) {
    console.error("Failed to update CPF contributions:", error);
    throw error;
  }
}