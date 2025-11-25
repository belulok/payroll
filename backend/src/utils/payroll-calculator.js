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
  const monthlySalary = worker.payrollInfo.monthlySalary || 0;

  // Get working days in period
  const workingDays = await GazettedHoliday.getWorkingDays(
    company._id,
    periodStart,
    periodEnd
  );

  // Get approved leave days
  const leaveRequests = await LeaveRequest.find({
    worker: worker._id,
    status: 'approved',
    startDate: { $lte: periodEnd },
    endDate: { $gte: periodStart }
  }).populate('leaveType');

  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  for (const leave of leaveRequests) {
    const leaveType = leave.leaveType;
    if (leaveType.isPaid) {
      paidLeaveDays += leave.totalDays;
    } else {
      unpaidLeaveDays += leave.totalDays;
    }
  }

  // Calculate actual working days (excluding unpaid leave)
  const actualWorkingDays = workingDays - unpaidLeaveDays;
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
    baseSalary,
    monthlySalary,
    workingDays,
    paidLeaveDays,
    unpaidLeaveDays,
    actualWorkingDays,
    grossPay: baseSalary,
    normalHours: 0,
    ot1_5Hours: 0,
    ot2_0Hours: 0,
    totalHours: 0
  };
}

/**
 * Calculate payroll for Type 2: Hourly workers
 */
async function calculateHourlyPayroll(worker, company, periodStart, periodEnd) {
  // Find approved weekly timesheets
  const timesheets = await Timesheet.find({
    worker: worker._id,
    company: company._id,
    weekStartDate: {
      $gte: periodStart,
      $lte: periodEnd
    },
    status: 'approved_admin',
    isDeleted: false
  });

  if (timesheets.length === 0) {
    throw new Error('No approved timesheets found for this period');
  }

  // Calculate total hours from weekly timesheets
  const totalNormalHours = timesheets.reduce((sum, ts) => sum + (ts.totalNormalHours || 0), 0);
  const totalOT1_5Hours = timesheets.reduce((sum, ts) => sum + (ts.totalOT1_5Hours || 0), 0);
  const totalOT2_0Hours = timesheets.reduce((sum, ts) => sum + (ts.totalOT2_0Hours || 0), 0);
  const totalHours = totalNormalHours + totalOT1_5Hours + totalOT2_0Hours;

  // Get rates
  const hourlyRate = worker.payrollInfo.hourlyRate;
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
    grossPay: grossPayCalc.grossPay
  };
}

/**
 * Calculate payroll for Type 3: Unit-based workers
 */
async function calculateUnitBasedPayroll(worker, company, periodStart, periodEnd) {
  // Find approved unit records
  const unitRecords = await UnitRecord.find({
    worker: worker._id,
    company: company._id,
    date: {
      $gte: periodStart,
      $lte: periodEnd
    },
    status: 'approved'
  });

  if (unitRecords.length === 0) {
    throw new Error('No approved unit records found for this period');
  }

  // Calculate total by unit type
  const unitSummary = {};
  let totalAmount = 0;

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
    summary.totalUnits += record.unitsCompleted;
    summary.rejectedUnits += record.unitsRejected || 0;
    summary.acceptedUnits = summary.totalUnits - summary.rejectedUnits;
    summary.totalAmount += record.totalAmount;
    totalAmount += record.totalAmount;
  }

  return {
    paymentType: 'unit-based',
    unitRecords: unitRecords.map(ur => ur._id),
    unitSummary,
    totalAmount,
    grossPay: totalAmount,
    normalHours: 0,
    ot1_5Hours: 0,
    ot2_0Hours: 0,
    totalHours: 0
  };
}

module.exports = {
  calculateMonthlySalaryPayroll,
  calculateHourlyPayroll,
  calculateUnitBasedPayroll
};

