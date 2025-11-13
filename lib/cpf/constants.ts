const normalize = (value: string) => value.trim().toLowerCase();

export const CPF_EMPLOYER_CONTRIBUTION_SOURCE = "CPF Employer Contribution";
export const CPF_EMPLOYER_CONTRIBUTION_CATEGORY = "government_benefit";
export const CPF_EMPLOYEE_CONTRIBUTION_SOURCE = "CPF Employee Contribution";
export const CPF_EMPLOYEE_CONTRIBUTION_CATEGORY = "retirement_savings";

const CPF_EMPLOYER_CONTRIBUTION_SOURCE_NORMALIZED = normalize(
  CPF_EMPLOYER_CONTRIBUTION_SOURCE
);
const CPF_EMPLOYEE_CONTRIBUTION_SOURCE_NORMALIZED = normalize(
  CPF_EMPLOYEE_CONTRIBUTION_SOURCE
);

export const isCPFEmployerContributionName = (value: string) =>
  normalize(value) === CPF_EMPLOYER_CONTRIBUTION_SOURCE_NORMALIZED;

export const isCPFEmployeeContributionName = (value: string) =>
  normalize(value) === CPF_EMPLOYEE_CONTRIBUTION_SOURCE_NORMALIZED;
