const Timesheet = require('../models/timesheet.model');
const UnitRecord = require('../models/unit-record.model');
const GazettedHoliday = require('../models/gazetted-holiday.model');
const LeaveRequest = require('../models/leave-request.model');
const {
  calculateStatutoryDeductions,
  calculateGrossPay,
  hourlyToMonthly
} = require('./statutory-calculations');

/**
 * Calculate payroll for Type 1: Monthly Salary workers
 */
async function calculateMonthlySalaryPayroll(worker, company, periodStart, periodEnd) {
  const monthlySalary = worker.payrollInfo?.monthlySalary || 0;

  if (!monthlySalary || monthlySalary <= 0) {
    throw new Error('Monthly salary not configured for this worker');
  }

  // Get working days in period (with fallback)
  let workingDays = 22; // Default working days in a month
  try {
    workingDays = await GazettedHoliday.getWorkingDays(
      company._id,
      periodStart,
      periodEnd
    );
  } catch (error) {
    console.warn('Could not calculate working days, using default:', error.message);
  }

  // Get approved leave days
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  try {
    const leaveRequests = await LeaveRequest.find({
      worker: worker._id,
      status: 'approved',
      startDate: { $lte: periodEnd },
      endDate: { $gte: periodStart }
    }).populate('leaveType');

    for (const leave of leaveRequests) {
      const leaveType = leave.leaveType;
      if (leaveType && leaveType.isPaid) {
        paidLeaveDays += leave.totalDays || 0;
      } else {
        unpaidLeaveDays += leave.totalDays || 0;
      }
    }
  } catch (error) {
    console.warn('Could not fetch leave requests:', error.message);
  }

  // Calculate actual working days (excluding unpaid leave)
  const actualWorkingDays = Math.max(0, workingDays - unpaidLeaveDays);
  const totalDaysInMonth = new Date(
    periodEnd.getFullYear(),
    periodEnd.getMonth() + 1,
    0
  ).getDate();

  // Pro-rated salary if unpaid leave taken
  const baseSalary = unpaidLeaveDays > 0
    ? (monthlySalary / totalDaysInMonth) * actualWorkingDays
    : monthlySalary;

  return {
    paymentType: 'monthly-salary',
    baseSalary: Math.round(baseSalary * 100) / 100,
    monthlySalary,
    workingDays,
    paidLeaveDays,
    unpaidLeaveDays,
    actualWorkingDays,
    grossPay: Math.round(baseSalary * 100) / 100,
    // Not applicable for monthly-salary but include with defaults
    totalNormalHours: 0,
    totalOT1_5Hours: 0,
    totalOT2_0Hours: 0,
    totalHours: 0,
    hourlyRate: 0,
    normalPay: 0,
    ot1_5Pay: 0,
    ot2_0Pay: 0
  };
}

/**
 * Calculate payroll for Type 2: Hourly workers
 */
async function calculateHourlyPayroll(worker, company, periodStart, periodEnd) {
  const hourlyRate = worker.payrollInfo?.hourlyRate || 0;

  if (!hourlyRate || hourlyRate <= 0) {
    throw new Error('Hourly rate not configured for this worker');
  }

  // Find approved weekly timesheets
  const timesheets = await Timesheet.find({
    worker: worker._id,
    company: company._id,
    weekStartDate: {
      $gte: periodStart,
      $lte: periodEnd
    },
    status: { $in: ['approved_admin', 'approved'] },
    isDeleted: { $ne: true }
  });

  // Calculate total hours from weekly timesheets
  const totalNormalHours = timesheets.reduce((sum, ts) => sum + (ts.totalNormalHours || 0), 0);
  const totalOT1_5Hours = timesheets.reduce((sum, ts) => sum + (ts.totalOT1_5Hours || 0), 0);
  const totalOT2_0Hours = timesheets.reduce((sum, ts) => sum + (ts.totalOT2_0Hours || 0), 0);
  const totalHours = totalNormalHours + totalOT1_5Hours + totalOT2_0Hours;

  // Get OT rates
  const otRates = {
    ot1_5: company.payrollSettings?.overtimeRates?.ot1_5 || 1.5,
    ot2_0: company.payrollSettings?.overtimeRates?.ot2_0 || 2.0
  };

  // Calculate gross pay
  const grossPayCalc = calculateGrossPay(
    { normal: totalNormalHours, ot1_5: totalOT1_5Hours, ot2_0: totalOT2_0Hours },
    hourlyRate,
    otRates
  );

  return {
    paymentType: 'hourly',
    timesheets: timesheets.map(ts => ts._id),
    totalNormalHours,
    totalOT1_5Hours,
    totalOT2_0Hours,
    totalHours,
    hourlyRate,
    ot1_5Rate: hourlyRate * otRates.ot1_5,
    ot2_0Rate: hourlyRate * otRates.ot2_0,
    normalPay: grossPayCalc.normalPay,
    ot1_5Pay: grossPayCalc.ot1_5Pay,
    ot2_0Pay: grossPayCalc.ot2_0Pay,
    grossPay: grossPayCalc.grossPay,
    // Defaults for non-applicable fields
    monthlySalary: 0,
    baseSalary: 0
  };
}

/**
 * Calculate payroll for Type 3: Unit-based workers
 */
async function calculateUnitBasedPayroll(worker, company, periodStart, periodEnd) {
  // Get unit rates from worker config
  const unitRates = worker.payrollInfo?.unitRates || [];

  // Find approved unit records
  let unitRecords = [];
  try {
    unitRecords = await UnitRecord.find({
      worker: worker._id,
      company: company._id,
      date: {
        $gte: periodStart,
        $lte: periodEnd
      },
      status: { $in: ['approved', 'approved_admin'] }
    });
  } catch (error) {
    console.warn('Could not fetch unit records:', error.message);
  }

  // Calculate total by unit type
  const unitSummary = {};
  let totalAmount = 0;
  let totalUnits = 0;

  // Build unit rates array for the payroll record
  const unitRatesBreakdown = [];

  for (const record of unitRecords) {
    if (!unitSummary[record.unitType]) {
      unitSummary[record.unitType] = {
        totalUnits: 0,
        rejectedUnits: 0,
        acceptedUnits: 0,
        ratePerUnit: record.ratePerUnit,
        totalAmount: 0
      };
    }

    const summary = unitSummary[record.unitType];
    summary.totalUnits += record.unitsCompleted || 0;
    summary.rejectedUnits += record.unitsRejected || 0;
    summary.acceptedUnits = summary.totalUnits - summary.rejectedUnits;
    summary.totalAmount += record.totalAmount || 0;
    totalAmount += record.totalAmount || 0;
    totalUnits += record.unitsCompleted || 0;
  }

  // Convert summary to unit rates breakdown
  for (const [unitType, summary] of Object.entries(unitSummary)) {
    unitRatesBreakdown.push({
      unitType,
      ratePerUnit: summary.ratePerUnit,
      quantity: summary.acceptedUnits,
      totalAmount: summary.totalAmount
    });
  }

  return {
    paymentType: 'unit-based',
    unitRecords: unitRecords.map(ur => ur._id),
    unitSummary,
    unitRates: unitRatesBreakdown,
    totalUnits,
    totalUnitAmount: totalAmount,
    grossPay: totalAmount,
    // Defaults for non-applicable fields
    totalNormalHours: 0,
    totalOT1_5Hours: 0,
    totalOT2_0Hours: 0,
    totalHours: 0,
    hourlyRate: 0,
    monthlySalary: 0,
    baseSalary: 0,
    normalPay: 0,
    ot1_5Pay: 0,
    ot2_0Pay: 0
  };
}

module.exports = {
  calculateMonthlySalaryPayroll,
  calculateHourlyPayroll,
  calculateUnitBasedPayroll
};

