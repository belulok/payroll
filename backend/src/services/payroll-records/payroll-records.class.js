const { Service } = require('feathers-mongoose');
const Timesheet = require('../../models/timesheet.model');
const Worker = require('../../models/worker.model');
const CompensationConfig = require('../../models/compensation-config.model');
const Loan = require('../../models/loan.model');
const {
  calculateStatutoryDeductions,
  calculateGrossPay,
  hourlyToMonthly
} = require('../../utils/statutory-calculations');
const {
  calculateMonthlySalaryPayroll,
  calculateHourlyPayroll,
  calculateUnitBasedPayroll
} = require('../../utils/payroll-calculator');

class PayrollRecords extends Service {
  constructor(options, app) {
    super(options, app);
    this.app = app;
  }

  // Override find to filter by company for subcon-admin
  async find(params) {
    if (params.user && params.user.role === 'subcon-admin') {
      params.query = params.query || {};
      params.query.company = params.user.company;
    }
    return super.find(params);
  }

  // Override get to check company access
  async get(id, params) {
    const payroll = await super.get(id, params);

    if (params.user && params.user.role === 'subcon-admin') {
      if (payroll.company.toString() !== params.user.company.toString()) {
        throw new Error('Unauthorized access to payroll record');
      }
    }

    return payroll;
  }

  // Helper: Get deduction configuration for worker (Group priority > Job Band)
  async getDeductionConfig(worker, companyId) {
    const compensationConfig = await CompensationConfig.findOne({ company: companyId });
    if (!compensationConfig || !compensationConfig.deductionConfigs) {
      return null;
    }

    const deductionConfigs = compensationConfig.deductionConfigs;

    // Priority 1: Check Worker Group configuration
    if (worker.workerGroup) {
      const groupConfig = deductionConfigs.find(
        c => c.configType === 'group' &&
        c.group && c.group.toString() === worker.workerGroup.toString()
      );
      if (groupConfig) return groupConfig;
    }

    // Priority 2: Check Job Band configuration
    if (worker.jobBand) {
      const bandConfig = deductionConfigs.find(
        c => c.configType === 'band' &&
        c.jobBand && c.jobBand.toString() === worker.jobBand.toString()
      );
      if (bandConfig) return bandConfig;
    }

    return null;
  }

  // Helper: Get active loans/advances for worker with pending installments
  async getActiveLoansForPayroll(workerId, periodEnd) {
    const activeLoans = await Loan.find({
      worker: workerId,
      status: 'active',
      remainingAmount: { $gt: 0 }
    });

    const loanDeductions = [];

    for (const loan of activeLoans) {
      // Find the next pending installment due within or before this period
      let deductionAmount = 0;

      if (loan.hasInstallments && loan.installments.length > 0) {
        // Find pending installments due on or before periodEnd
        const pendingInstallment = loan.installments.find(
          inst => inst.status === 'pending' && new Date(inst.dueDate) <= new Date(periodEnd)
        );
        if (pendingInstallment) {
          deductionAmount = pendingInstallment.amount - (pendingInstallment.paidAmount || 0);
        }
      } else {
        // No installments - deduct remaining amount (or full if advance)
        if (loan.category === 'advance') {
          // Advances typically deducted in full
          deductionAmount = loan.remainingAmount;
        } else {
          // For loans without installments, use installmentAmount if set
          deductionAmount = loan.installmentAmount || loan.remainingAmount;
        }
      }

      if (deductionAmount > 0) {
        loanDeductions.push({
          loanId: loan._id,
          loanCode: loan.loanId,
          category: loan.category,
          description: loan.description || (loan.category === 'advance' ? 'Salary Advance' : 'Loan Repayment'),
          amount: Math.min(deductionAmount, loan.remainingAmount),
          remainingAfter: Math.max(0, loan.remainingAmount - deductionAmount)
        });
      }
    }

    return loanDeductions;
  }

  // Custom method: Generate payroll based on payment type
  async generatePayroll(workerId, periodStart, periodEnd, params) {
    const worker = await Worker.findById(workerId).populate('company');
    if (!worker) {
      throw new Error('Worker not found');
    }

    // Check company access for subcon-admin
    if (params.user && params.user.role === 'subcon-admin') {
      if (worker.company._id.toString() !== params.user.company.toString()) {
        throw new Error('Unauthorized access to worker');
      }
    }

    const company = worker.company;
    const paymentType = worker.paymentType || 'hourly';

    // Calculate based on payment type
    let payrollCalc;

    switch (paymentType) {
      case 'monthly-salary':
        payrollCalc = await calculateMonthlySalaryPayroll(worker, company, new Date(periodStart), new Date(periodEnd));
        break;

      case 'hourly':
        payrollCalc = await calculateHourlyPayroll(worker, company, new Date(periodStart), new Date(periodEnd));
        break;

      case 'unit-based':
        payrollCalc = await calculateUnitBasedPayroll(worker, company, new Date(periodStart), new Date(periodEnd));
        break;

      default:
        throw new Error(`Unsupported payment type: ${paymentType}`);
    }

    let grossPay = payrollCalc.grossPay || 0;

    // Safely access payrollInfo
    const payrollInfo = worker.payrollInfo || {};

    // Process allowances
    const allowances = payrollInfo.allowances || [];
    let totalAllowances = 0;

    for (const allowance of allowances) {
      if (allowance.type === 'fixed') {
        totalAllowances += allowance.amount || 0;
      } else if (allowance.type === 'percentage') {
        totalAllowances += (grossPay * (allowance.amount || 0)) / 100;
      }
    }

    grossPay += totalAllowances;

    // Calculate monthly wage for statutory deductions
    let monthlyWage;
    if (paymentType === 'monthly-salary') {
      monthlyWage = payrollInfo.monthlySalary || 0;
    } else if (paymentType === 'hourly') {
      monthlyWage = hourlyToMonthly(payrollInfo.hourlyRate || 0);
    } else {
      monthlyWage = grossPay;
    }

    // Get deduction configuration from Compensation settings (Group priority > Job Band)
    const deductionConfig = await this.getDeductionConfig(worker, company._id);

    // Calculate statutory deductions with custom rates if available
    let epf, socso, eis;

    if (deductionConfig) {
      // Use custom rates from deduction configuration
      epf = deductionConfig.epfEnabled !== false ? {
        employee: Math.round(monthlyWage * (deductionConfig.epfEmployeeRate || 11) / 100 * 100) / 100,
        employer: Math.round(monthlyWage * (deductionConfig.epfEmployerRate || 12) / 100 * 100) / 100,
        total: 0
      } : { employee: 0, employer: 0, total: 0 };
      epf.total = epf.employee + epf.employer;

      socso = deductionConfig.socsoEnabled !== false ? {
        employee: Math.round(monthlyWage * (deductionConfig.socsoEmployeeRate || 0.5) / 100 * 100) / 100,
        employer: Math.round(monthlyWage * (deductionConfig.socsoEmployerRate || 1.75) / 100 * 100) / 100,
        total: 0
      } : { employee: 0, employer: 0, total: 0 };
      socso.total = socso.employee + socso.employer;

      eis = deductionConfig.eisEnabled !== false ? {
        employee: Math.round(monthlyWage * (deductionConfig.eisEmployeeRate || 0.2) / 100 * 100) / 100,
        employer: Math.round(monthlyWage * (deductionConfig.eisEmployerRate || 0.2) / 100 * 100) / 100,
        total: 0
      } : { employee: 0, employer: 0, total: 0 };
      eis.total = eis.employee + eis.employer;
    } else {
      // Use default statutory calculations
      const statutory = calculateStatutoryDeductions(monthlyWage, {
        epfEnabled: company.payrollSettings?.epfEnabled !== false,
        socsoEnabled: company.payrollSettings?.socsoEnabled !== false,
        eisEnabled: company.payrollSettings?.eisEnabled !== false
      });
      epf = statutory.epf;
      socso = statutory.socso;
      eis = statutory.eis;
    }

    // Get custom deductions from configuration
    const customDeductions = deductionConfig?.customDeductions || [];
    let customDeductionTotal = 0;
    const processedCustomDeductions = [];

    for (const deduction of customDeductions) {
      let amount = 0;
      if (deduction.type === 'fixed') {
        amount = deduction.amount || 0;
      } else if (deduction.type === 'percentage') {
        amount = Math.round(grossPay * (deduction.amount || 0) / 100 * 100) / 100;
      }
      customDeductionTotal += amount;
      processedCustomDeductions.push({
        name: deduction.name,
        description: deduction.description,
        amount,
        type: deduction.type
      });
    }

    // Get loans and advances for deduction
    const loanDeductions = await this.getActiveLoansForPayroll(workerId, new Date(periodEnd));
    const totalLoanDeduction = loanDeductions.reduce((sum, l) => sum + l.amount, 0);

    // Process worker's individual deductions (from payrollInfo)
    const workerDeductions = payrollInfo.deductions || [];
    let workerDeductionTotal = 0;

    for (const deduction of workerDeductions) {
      if (deduction.type === 'fixed') {
        workerDeductionTotal += deduction.amount || 0;
      } else if (deduction.type === 'percentage') {
        workerDeductionTotal += (grossPay * (deduction.amount || 0)) / 100;
      }
    }

    // Calculate totals
    const statutoryEmployeeTotal = (epf?.employee || 0) + (socso?.employee || 0) + (eis?.employee || 0);
    const totalDeductions = statutoryEmployeeTotal + customDeductionTotal + workerDeductionTotal + totalLoanDeduction;
    const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

    // Create payroll record
    const payrollData = {
      company: company._id,
      worker: workerId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      paymentType,

      // Common fields
      allowances,
      totalAllowances,
      grossPay: Math.round(grossPay * 100) / 100,

      // Statutory deductions with custom rates
      epf: {
        employeeContribution: epf?.employee || 0,
        employerContribution: epf?.employer || 0,
        totalContribution: epf?.total || 0
      },
      socso: {
        employeeContribution: socso?.employee || 0,
        employerContribution: socso?.employer || 0,
        totalContribution: socso?.total || 0
      },
      eis: {
        employeeContribution: eis?.employee || 0,
        employerContribution: eis?.employer || 0,
        totalContribution: eis?.total || 0
      },

      // Deduction configuration used
      deductionConfigType: deductionConfig ? deductionConfig.configType : null,
      deductionConfigSource: deductionConfig ?
        (deductionConfig.configType === 'group' ? deductionConfig.groupName : deductionConfig.jobBandName) : null,

      // Custom deductions from compensation config
      customDeductions: processedCustomDeductions,
      totalCustomDeductions: customDeductionTotal,

      // Worker's individual deductions
      deductions: workerDeductions,

      // Loan and Advance deductions
      loanDeductions,
      totalLoanDeductions: totalLoanDeduction,

      // Totals
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPay,
      status: 'draft',
      paymentStatus: 'pending',
      createdBy: params.user._id,
      bankDetails: {
        bankName: payrollInfo.bankName || '',
        accountNumber: payrollInfo.bankAccountNumber || '',
        accountHolderName: payrollInfo.bankAccountName || ''
      },

      // Payment type specific fields
      ...payrollCalc
    };

    return this.create(payrollData, params);
  }
}

exports.PayrollRecords = PayrollRecords;

