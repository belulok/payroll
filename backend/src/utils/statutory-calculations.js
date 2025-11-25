/**
 * Malaysian Statutory Calculations
 * EPF, SOCSO, EIS rates based on 2024/2025 regulations
 */

/**
 * Calculate EPF (Employees Provident Fund) contributions
 * Employee: 11% of monthly wages
 * Employer: 12% or 13% depending on wage amount
 * 
 * @param {number} monthlyWage - Monthly wage in MYR
 * @returns {object} { employee, employer, total }
 */
function calculateEPF(monthlyWage) {
  if (monthlyWage <= 0) {
    return { employee: 0, employer: 0, total: 0 };
  }

  // Employee contribution: 11%
  const employeeContribution = Math.round(monthlyWage * 0.11 * 100) / 100;

  // Employer contribution: 13% for wages <= RM5,000, 12% for wages > RM5,000
  const employerRate = monthlyWage <= 5000 ? 0.13 : 0.12;
  const employerContribution = Math.round(monthlyWage * employerRate * 100) / 100;

  return {
    employee: employeeContribution,
    employer: employerContribution,
    total: employeeContribution + employerContribution
  };
}

/**
 * Calculate SOCSO (Social Security Organization) contributions
 * Based on wage brackets (First Category - employees earning RM4,000 and below)
 * 
 * @param {number} monthlyWage - Monthly wage in MYR
 * @returns {object} { employee, employer, total }
 */
function calculateSOCSO(monthlyWage) {
  if (monthlyWage <= 0) {
    return { employee: 0, employer: 0, total: 0 };
  }

  // SOCSO contribution table (simplified - actual table has many brackets)
  // For wages above RM4,000, SOCSO is optional/not applicable for new employees
  if (monthlyWage > 4000) {
    return { employee: 0, employer: 0, total: 0 };
  }

  // Simplified calculation: 0.5% employee, 1.75% employer
  const employeeContribution = Math.round(monthlyWage * 0.005 * 100) / 100;
  const employerContribution = Math.round(monthlyWage * 0.0175 * 100) / 100;

  // Cap at maximum contribution
  const maxEmployee = 19.75;
  const maxEmployer = 69.05;

  return {
    employee: Math.min(employeeContribution, maxEmployee),
    employer: Math.min(employerContribution, maxEmployer),
    total: Math.min(employeeContribution, maxEmployee) + Math.min(employerContribution, maxEmployer)
  };
}

/**
 * Calculate EIS (Employment Insurance System) contributions
 * Employee: 0.2% of monthly wages (max RM7.90)
 * Employer: 0.2% of monthly wages (max RM7.90)
 * 
 * @param {number} monthlyWage - Monthly wage in MYR
 * @returns {object} { employee, employer, total }
 */
function calculateEIS(monthlyWage) {
  if (monthlyWage <= 0) {
    return { employee: 0, employer: 0, total: 0 };
  }

  // Both employee and employer contribute 0.2%
  const contribution = Math.round(monthlyWage * 0.002 * 100) / 100;

  // Maximum contribution is RM7.90 each
  const maxContribution = 7.90;
  const cappedContribution = Math.min(contribution, maxContribution);

  return {
    employee: cappedContribution,
    employer: cappedContribution,
    total: cappedContribution * 2
  };
}

/**
 * Calculate all statutory deductions
 * 
 * @param {number} monthlyWage - Monthly wage in MYR
 * @param {object} options - { epfEnabled, socsoEnabled, eisEnabled }
 * @returns {object} { epf, socso, eis, totalEmployee, totalEmployer, totalDeductions }
 */
function calculateStatutoryDeductions(monthlyWage, options = {}) {
  const {
    epfEnabled = true,
    socsoEnabled = true,
    eisEnabled = true
  } = options;

  const epf = epfEnabled ? calculateEPF(monthlyWage) : { employee: 0, employer: 0, total: 0 };
  const socso = socsoEnabled ? calculateSOCSO(monthlyWage) : { employee: 0, employer: 0, total: 0 };
  const eis = eisEnabled ? calculateEIS(monthlyWage) : { employee: 0, employer: 0, total: 0 };

  const totalEmployee = epf.employee + socso.employee + eis.employee;
  const totalEmployer = epf.employer + socso.employer + eis.employer;

  return {
    epf,
    socso,
    eis,
    totalEmployee: Math.round(totalEmployee * 100) / 100,
    totalEmployer: Math.round(totalEmployer * 100) / 100,
    totalDeductions: Math.round((totalEmployee + totalEmployer) * 100) / 100
  };
}

/**
 * Convert hourly wage to monthly wage (assuming 26 working days, 8 hours per day)
 * 
 * @param {number} hourlyRate - Hourly rate in MYR
 * @returns {number} Monthly wage in MYR
 */
function hourlyToMonthly(hourlyRate) {
  return Math.round(hourlyRate * 8 * 26 * 100) / 100;
}

/**
 * Calculate gross pay from hours and rates
 * 
 * @param {object} hours - { normal, ot1_5, ot2_0 }
 * @param {number} hourlyRate - Base hourly rate
 * @param {object} otRates - { ot1_5: 1.5, ot2_0: 2.0 }
 * @returns {object} { normalPay, ot1_5Pay, ot2_0Pay, grossPay }
 */
function calculateGrossPay(hours, hourlyRate, otRates = { ot1_5: 1.5, ot2_0: 2.0 }) {
  const normalPay = Math.round(hours.normal * hourlyRate * 100) / 100;
  const ot1_5Pay = Math.round(hours.ot1_5 * hourlyRate * otRates.ot1_5 * 100) / 100;
  const ot2_0Pay = Math.round(hours.ot2_0 * hourlyRate * otRates.ot2_0 * 100) / 100;
  const grossPay = normalPay + ot1_5Pay + ot2_0Pay;

  return {
    normalPay,
    ot1_5Pay,
    ot2_0Pay,
    grossPay: Math.round(grossPay * 100) / 100
  };
}

module.exports = {
  calculateEPF,
  calculateSOCSO,
  calculateEIS,
  calculateStatutoryDeductions,
  hourlyToMonthly,
  calculateGrossPay
};

