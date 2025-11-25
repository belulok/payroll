require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Company = require('./src/models/company.model');
const Worker = require('./src/models/worker.model');
const Timesheet = require('./src/models/timesheet.model');
const PayrollRecord = require('./src/models/payroll-record.model');

// Import utilities
const {
  calculateStatutoryDeductions,
  calculateGrossPay
} = require('./src/utils/statutory-calculations');

async function seedPhase3() {
  try {
    // Connect to MongoDB
    const mongooseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll';
    await mongoose.connect(mongooseUri);
    console.log('✓ Connected to MongoDB\n');

    // Define User schema
    const userSchema = new mongoose.Schema({
      email: { type: String, unique: true, lowercase: true, required: true },
      password: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      role: {
        type: String,
        enum: ['admin', 'subcon-admin', 'worker', 'agent', 'user'],
        default: 'user',
        required: true
      },
      company: { type: mongoose.Schema.Types.ObjectId, ref: 'companies' },
      worker: { type: mongoose.Schema.Types.ObjectId, ref: 'workers' },
      isActive: { type: Boolean, default: true }
    }, { timestamps: true });

    const User = mongoose.models.users || mongoose.model('users', userSchema);

    // Get existing data
    console.log('1. Fetching existing data...');
    const company = await Company.findOne({ email: 'subcon1@example.com' });
    if (!company) {
      console.log('   ✗ Company not found. Please run seed:phase1 first.');
      process.exit(1);
    }

    const subconAdmin = await User.findOne({ email: 'subcon.admin@example.com' });
    if (!subconAdmin) {
      console.log('   ✗ Subcon Admin not found. Please run seed:phase1 first.');
      process.exit(1);
    }

    const workers = await Worker.find({ company: company._id });
    if (workers.length === 0) {
      console.log('   ✗ No workers found. Please run seed:phase1 first.');
      process.exit(1);
    }

    console.log(`   ✓ Found company: ${company.name}`);
    console.log(`   ✓ Found ${workers.length} workers`);

    // 2. Generate Payroll Records
    console.log('\n2. Generating Payroll Records...');

    const periodStart = new Date('2025-11-01');
    const periodEnd = new Date('2025-11-30');

    for (const worker of workers) {
      // Find approved timesheets for this worker
      const timesheets = await Timesheet.find({
        worker: worker._id,
        company: company._id,
        status: 'approved_admin',
        isDeleted: false
      });

      if (timesheets.length === 0) {
        console.log(`   ⚠ No approved timesheets for ${worker.firstName} ${worker.lastName} - skipping`);
        continue;
      }

      // Check if payroll already exists
      const existing = await PayrollRecord.findOne({
        worker: worker._id,
        company: company._id,
        periodStart,
        periodEnd
      });

      if (existing) {
        console.log(`   ✓ Payroll already exists: ${worker.firstName} ${worker.lastName}`);
        continue;
      }

      // Calculate totals
      const totalNormalHours = timesheets.reduce((sum, ts) => sum + (ts.normalHours || 0), 0);
      const totalOT1_5Hours = timesheets.reduce((sum, ts) => sum + (ts.ot1_5Hours || 0), 0);
      const totalOT2_0Hours = timesheets.reduce((sum, ts) => sum + (ts.ot2_0Hours || 0), 0);

      const hourlyRate = worker.payrollInfo.hourlyRate;
      const otRates = {
        ot1_5: company.payrollSettings.overtimeRates.ot1_5,
        ot2_0: company.payrollSettings.overtimeRates.ot2_0
      };

      // Calculate gross pay
      const grossPayCalc = calculateGrossPay(
        { normal: totalNormalHours, ot1_5: totalOT1_5Hours, ot2_0: totalOT2_0Hours },
        hourlyRate,
        otRates
      );

      // Calculate statutory deductions
      const statutory = calculateStatutoryDeductions(grossPayCalc.grossPay, {
        epfEnabled: company.payrollSettings.epfEnabled,
        socsoEnabled: company.payrollSettings.socsoEnabled,
        eisEnabled: company.payrollSettings.eisEnabled
      });

      const netPay = grossPayCalc.grossPay - statutory.totalEmployee;

      // Create payroll record
      await PayrollRecord.create({
        company: company._id,
        worker: worker._id,
        periodStart,
        periodEnd,
        timesheets: timesheets.map(ts => ts._id),
        totalNormalHours,
        totalOT1_5Hours,
        totalOT2_0Hours,
        totalHours: totalNormalHours + totalOT1_5Hours + totalOT2_0Hours,
        hourlyRate,
        ot1_5Rate: hourlyRate * otRates.ot1_5,
        ot2_0Rate: hourlyRate * otRates.ot2_0,
        normalPay: grossPayCalc.normalPay,
        ot1_5Pay: grossPayCalc.ot1_5Pay,
        ot2_0Pay: grossPayCalc.ot2_0Pay,
        grossPay: grossPayCalc.grossPay,
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
        totalDeductions: statutory.totalEmployee,
        netPay,
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: subconAdmin._id
      });

      console.log(`   ✓ Payroll created: ${worker.firstName} ${worker.lastName} - Net Pay: RM ${netPay.toFixed(2)}`);
    }

    console.log('\n✅ Phase 3 Seed Complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('PAYROLL RECORDS CREATED:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nPayroll records generated for November 2025');
    console.log('Includes:');
    console.log('  - Gross pay calculation (Normal + OT1.5 + OT2.0)');
    console.log('  - EPF deductions (Employee + Employer)');
    console.log('  - SOCSO deductions (Employee + Employer)');
    console.log('  - EIS deductions (Employee + Employer)');
    console.log('  - Net pay calculation');
    console.log('\n═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedPhase3();

