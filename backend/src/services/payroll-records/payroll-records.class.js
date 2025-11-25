const { Service } = require('feathers-mongoose');
const Timesheet = require('../../models/timesheet.model');
const Worker = require('../../models/worker.model');
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

    let grossPay = payrollCalc.grossPay;

    // Process allowances
    const allowances = worker.payrollInfo.allowances || [];
    let totalAllowances = 0;

    for (const allowance of allowances) {
      if (allowance.type === 'fixed') {
        totalAllowances += allowance.amount;
      } else if (allowance.type === 'percentage') {
        totalAllowances += (grossPay * allowance.amount) / 100;
      }
    }

    grossPay += totalAllowances;

    // Calculate statutory deductions based on payment type
    let monthlyWage;
    if (paymentType === 'monthly-salary') {
      monthlyWage = worker.payrollInfo.monthlySalary || 0;
    } else if (paymentType === 'hourly') {
      monthlyWage = hourlyToMonthly(worker.payrollInfo.hourlyRate);
    } else {
      // For unit-based, use gross pay as monthly wage
      monthlyWage = grossPay;
    }

    const statutory = calculateStatutoryDeductions(monthlyWage, {
      epfEnabled: company.payrollSettings?.epfEnabled !== false,
      socsoEnabled: company.payrollSettings?.socsoEnabled !== false,
      eisEnabled: company.payrollSettings?.eisEnabled !== false
    });

    // Process other deductions
    const deductions = worker.payrollInfo.deductions || [];
    let otherDeductions = 0;

    for (const deduction of deductions) {
      if (deduction.type === 'fixed') {
        otherDeductions += deduction.amount;
      } else if (deduction.type === 'percentage') {
        otherDeductions += (grossPay * deduction.amount) / 100;
      }
    }

    const totalDeductions = statutory.totalEmployee + otherDeductions;
    const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

    // Create payroll record with payment type specific data
    const payrollData = {
      company: company._id,
      worker: workerId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      paymentType,

      // Common fields
      allowances,
      totalAllowances,
      epf: {
        employeeContribution: statutory.epf.employee,
        employerContribution: statutory.epf.employer,
        totalContribution: statutory.epf.total
      },
      socso: {
        employeeContribution: statutory.socso.employee,
        employerContribution: statutory.socso.employer,
        totalContribution: statutory.socso.total
      },
      eis: {
        employeeContribution: statutory.eis.employee,
        employerContribution: statutory.eis.employer,
        totalContribution: statutory.eis.total
      },
      deductions,
      totalDeductions,
      netPay,
      status: 'draft',
      paymentStatus: 'pending',
      createdBy: params.user._id,
      bankDetails: {
        bankName: worker.payrollInfo.bankName,
        accountNumber: worker.payrollInfo.bankAccountNumber,
        accountHolderName: worker.payrollInfo.bankAccountName
      },

      // Payment type specific fields
      ...payrollCalc
    };

    return this.create(payrollData, params);
  }
}

exports.PayrollRecords = PayrollRecords;

