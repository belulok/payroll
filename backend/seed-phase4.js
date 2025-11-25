require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const Company = require('./src/models/company.model');
const Worker = require('./src/models/worker.model');
const LeaveType = require('./src/models/leave-type.model');
const LeaveBalance = require('./src/models/leave-balance.model');
const GazettedHoliday = require('./src/models/gazetted-holiday.model');

async function seedPhase4() {
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

    // Get existing company
    const company = await Company.findOne({ email: 'subcon1@example.com' });
    if (!company) {
      console.log('❌ Company not found. Please run seed-phase1.js first.');
      process.exit(1);
    }

    console.log('Found company:', company.name);

    // Update company with payment types and QR settings
    console.log('\n1. Updating Company Settings...');
    company.paymentTypes = ['monthly-salary', 'hourly', 'unit-based'];
    company.qrCodeSettings = {
      enabled: true,
      qrCode: `QR-${company._id.toString().substring(0, 8).toUpperCase()}`,
      qrCodeGeneratedAt: new Date(),
      allowManualEdit: false
    };
    await company.save();
    console.log('   ✓ Company updated with payment types and QR code');

    // Create Leave Types
    console.log('\n2. Creating Leave Types...');
    const leaveTypesData = [
      {
        company: company._id,
        name: 'Annual Leave',
        code: 'AL',
        description: 'Annual vacation leave',
        isPaid: true,
        requiresApproval: true,
        useTiers: true,
        tiers: [
          { tierName: 'Junior', daysAllowed: 12, description: '0-2 years service' },
          { tierName: 'Senior', daysAllowed: 18, description: '3-5 years service' },
          { tierName: 'Manager', daysAllowed: 24, description: '5+ years service' }
        ],
        allowCarryForward: true,
        maxCarryForwardDays: 5,
        minDaysNotice: 3
      },
      {
        company: company._id,
        name: 'Sick Leave',
        code: 'SL',
        description: 'Medical sick leave',
        isPaid: true,
        requiresApproval: true,
        requiresDocument: true,
        useTiers: false,
        defaultDaysAllowed: 14,
        allowCarryForward: false
      },
      {
        company: company._id,
        name: 'Emergency Leave',
        code: 'EL',
        description: 'Emergency or compassionate leave',
        isPaid: true,
        requiresApproval: true,
        useTiers: false,
        defaultDaysAllowed: 5,
        allowCarryForward: false
      },
      {
        company: company._id,
        name: 'Unpaid Leave',
        code: 'UL',
        description: 'Unpaid personal leave',
        isPaid: false,
        requiresApproval: true,
        useTiers: false,
        defaultDaysAllowed: 0,
        allowCarryForward: false,
        minDaysNotice: 7
      }
    ];

    const createdLeaveTypes = [];
    for (const ltData of leaveTypesData) {
      let leaveType = await LeaveType.findOne({
        company: company._id,
        code: ltData.code
      });

      if (!leaveType) {
        leaveType = await LeaveType.create(ltData);
        console.log(`   ✓ Leave Type created: ${leaveType.name}`);
      } else {
        console.log(`   ✓ Leave Type already exists: ${leaveType.name}`);
      }
      createdLeaveTypes.push(leaveType);
    }

    // Create Gazetted Holidays for 2025
    console.log('\n3. Creating Gazetted Holidays (2025)...');
    const holidays2025 = [
      { name: "New Year's Day", date: '2025-01-01', type: 'public' },
      { name: 'Chinese New Year', date: '2025-01-29', type: 'public' },
      { name: 'Chinese New Year', date: '2025-01-30', type: 'public' },
      { name: 'Hari Raya Aidilfitri', date: '2025-03-31', type: 'public' },
      { name: 'Hari Raya Aidilfitri', date: '2025-04-01', type: 'public' },
      { name: 'Labour Day', date: '2025-05-01', type: 'public' },
      { name: 'Wesak Day', date: '2025-05-12', type: 'public' },
      { name: "Yang di-Pertuan Agong's Birthday", date: '2025-06-07', type: 'public' },
      { name: 'Hari Raya Aidiladha', date: '2025-06-07', type: 'public' },
      { name: 'Awal Muharram', date: '2025-06-27', type: 'public' },
      { name: 'Merdeka Day', date: '2025-08-31', type: 'public' },
      { name: 'Malaysia Day', date: '2025-09-16', type: 'public' },
      { name: 'Deepavali', date: '2025-10-20', type: 'public' },
      { name: 'Christmas Day', date: '2025-12-25', type: 'public' }
    ];

    for (const holiday of holidays2025) {
      const existing = await GazettedHoliday.findOne({
        company: company._id,
        date: new Date(holiday.date)
      });

      if (!existing) {
        await GazettedHoliday.create({
          company: company._id,
          name: holiday.name,
          date: new Date(holiday.date),
          year: 2025,
          type: holiday.type,
          isPaid: true,
          isActive: true
        });
        console.log(`   ✓ Holiday created: ${holiday.name} (${holiday.date})`);
      }
    }

    console.log('\n   ✓ Total holidays created for 2025');

    // Create Workers with different payment types
    console.log('\n4. Creating Workers with User Accounts...');

    const workersData = [
      // Type 1: Monthly Salary Workers
      {
        employeeId: 'MS001',
        firstName: 'Sarah',
        lastName: 'Wong',
        email: 'sarah.wong@example.com',
        phone: '+60123456711',
        icNumber: '880808-08-1111',
        position: 'Office Manager',
        department: 'Administration',
        paymentType: 'monthly-salary',
        leaveTier: 'Manager',
        payrollInfo: {
          monthlySalary: 4500.00,
          currency: 'MYR',
          epfNumber: 'EPF011',
          socsoNumber: 'SOCSO011',
          bankName: 'Maybank',
          bankAccountNumber: '1234567890',
          bankAccountName: 'Sarah Wong'
        },
        password: 'worker123'
      },
      {
        employeeId: 'MS002',
        firstName: 'David',
        lastName: 'Lim',
        email: 'david.lim@example.com',
        phone: '+60123456712',
        icNumber: '900909-09-2222',
        position: 'HR Executive',
        department: 'Human Resources',
        paymentType: 'monthly-salary',
        leaveTier: 'Senior',
        payrollInfo: {
          monthlySalary: 3800.00,
          currency: 'MYR',
          epfNumber: 'EPF012',
          socsoNumber: 'SOCSO012',
          bankName: 'CIMB',
          bankAccountNumber: '2345678901',
          bankAccountName: 'David Lim'
        },
        password: 'worker123'
      },

      // Type 2: Hourly Workers (existing workers - update them)
      {
        employeeId: 'W001',
        firstName: 'Ahmad',
        lastName: 'Ibrahim',
        email: 'ahmad@example.com',
        phone: '+60123456701',
        icNumber: '900101-01-1234',
        position: 'Construction Worker',
        department: 'Construction',
        paymentType: 'hourly',
        payrollInfo: {
          hourlyRate: 15.00,
          currency: 'MYR',
          epfNumber: 'EPF001',
          socsoNumber: 'SOCSO001',
          bankName: 'Public Bank',
          bankAccountNumber: '3456789012',
          bankAccountName: 'Ahmad Ibrahim'
        },
        password: 'worker123'
      },
      {
        employeeId: 'W002',
        firstName: 'Kumar',
        lastName: 'Subramaniam',
        email: 'kumar@example.com',
        phone: '+60123456702',
        icNumber: '850505-05-5678',
        position: 'Site Supervisor',
        department: 'Construction',
        paymentType: 'hourly',
        payrollInfo: {
          hourlyRate: 25.00,
          currency: 'MYR',
          epfNumber: 'EPF002',
          socsoNumber: 'SOCSO002',
          bankName: 'RHB Bank',
          bankAccountNumber: '4567890123',
          bankAccountName: 'Kumar Subramaniam'
        },
        password: 'worker123'
      },

      // Type 3: Unit-based Workers
      {
        employeeId: 'UB001',
        firstName: 'Muthu',
        lastName: 'Rajan',
        email: 'muthu.rajan@example.com',
        phone: '+60123456721',
        icNumber: '870707-07-3333',
        position: 'Bricklayer',
        department: 'Construction',
        paymentType: 'unit-based',
        payrollInfo: {
          currency: 'MYR',
          unitRates: [
            { unitType: 'Bricks Laid', ratePerUnit: 0.50 },
            { unitType: 'Blocks Laid', ratePerUnit: 0.75 }
          ],
          epfNumber: 'EPF021',
          socsoNumber: 'SOCSO021',
          bankName: 'Hong Leong Bank',
          bankAccountNumber: '5678901234',
          bankAccountName: 'Muthu Rajan'
        },
        password: 'worker123'
      },
      {
        employeeId: 'UB002',
        firstName: 'Siti',
        lastName: 'Aminah',
        email: 'siti.aminah@example.com',
        phone: '+60123456722',
        icNumber: '920202-02-4444',
        position: 'Seamstress',
        department: 'Production',
        paymentType: 'unit-based',
        payrollInfo: {
          currency: 'MYR',
          unitRates: [
            { unitType: 'Shirts Sewn', ratePerUnit: 5.00 },
            { unitType: 'Pants Sewn', ratePerUnit: 7.50 }
          ],
          epfNumber: 'EPF022',
          socsoNumber: 'SOCSO022',
          bankName: 'AmBank',
          bankAccountNumber: '6789012345',
          bankAccountName: 'Siti Aminah'
        },
        password: 'worker123'
      }
    ];

    const createdWorkers = [];
    for (const wData of workersData) {
      const password = wData.password;
      delete wData.password;

      // Create or update worker
      let worker = await Worker.findOne({
        company: company._id,
        employeeId: wData.employeeId
      });

      if (!worker) {
        worker = await Worker.create({
          ...wData,
          company: company._id,
          isActive: true,
          employmentStatus: 'active',
          hireDate: new Date('2024-01-01')
        });
        console.log(`   ✓ Worker created: ${worker.firstName} ${worker.lastName} (${worker.paymentType})`);
      } else {
        // Update existing worker with new fields
        Object.assign(worker, wData);
        await worker.save();
        console.log(`   ✓ Worker updated: ${worker.firstName} ${worker.lastName} (${worker.paymentType})`);
      }

      // Create user account for worker
      let workerUser = await User.findOne({ email: wData.email });
      if (!workerUser) {
        const hashedPassword = await bcrypt.hash(password, 10);
        workerUser = await User.create({
          email: wData.email,
          password: hashedPassword,
          firstName: wData.firstName,
          lastName: wData.lastName,
          role: 'worker',
          company: company._id,
          worker: worker._id,
          isActive: true
        });
        console.log(`   ✓ User account created for: ${wData.email}`);
      } else {
        // Update worker reference
        workerUser.worker = worker._id;
        workerUser.company = company._id;
        workerUser.role = 'worker';
        await workerUser.save();
        console.log(`   ✓ User account updated for: ${wData.email}`);
      }

      createdWorkers.push(worker);
    }

    // Initialize leave balances for monthly salary workers
    console.log('\n5. Initializing Leave Balances...');
    for (const worker of createdWorkers) {
      if (worker.paymentType === 'monthly-salary') {
        for (const leaveType of createdLeaveTypes) {
          const existing = await LeaveBalance.findOne({
            worker: worker._id,
            leaveType: leaveType._id,
            year: 2025
          });

          if (!existing) {
            let totalDays;
            if (leaveType.useTiers && worker.leaveTier) {
              totalDays = leaveType.getDaysAllowedForTier(worker.leaveTier);
            } else {
              totalDays = leaveType.defaultDaysAllowed || 0;
            }

            await LeaveBalance.create({
              company: company._id,  // Added missing company field
              worker: worker._id,
              leaveType: leaveType._id,
              year: 2025,
              totalDays,
              usedDays: 0,
              pendingDays: 0,
              carriedForwardDays: 0
            });
            console.log(`   ✓ Leave balance created: ${worker.firstName} - ${leaveType.name} (${totalDays} days)`);
          }
        }
      }
    }

    console.log('\n✅ Phase 4 Seed Complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('WORKER LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📊 MONTHLY SALARY WORKERS:');
    console.log('  1. Sarah Wong (Office Manager)');
    console.log('     Email:    sarah.wong@example.com');
    console.log('     Password: worker123');
    console.log('     Salary:   RM 4,500/month');
    console.log('     Tier:     Manager (24 days AL)');
    console.log('');
    console.log('  2. David Lim (HR Executive)');
    console.log('     Email:    david.lim@example.com');
    console.log('     Password: worker123');
    console.log('     Salary:   RM 3,800/month');
    console.log('     Tier:     Senior (18 days AL)');
    console.log('');
    console.log('⏰ HOURLY WORKERS:');
    console.log('  3. Ahmad Ibrahim (Construction Worker)');
    console.log('     Email:    ahmad@example.com');
    console.log('     Password: worker123');
    console.log('     Rate:     RM 15/hour');
    console.log('');
    console.log('  4. Kumar Subramaniam (Site Supervisor)');
    console.log('     Email:    kumar@example.com');
    console.log('     Password: worker123');
    console.log('     Rate:     RM 25/hour');
    console.log('');
    console.log('📦 UNIT-BASED WORKERS:');
    console.log('  5. Muthu Rajan (Bricklayer)');
    console.log('     Email:    muthu.rajan@example.com');
    console.log('     Password: worker123');
    console.log('     Rates:    RM 0.50/brick, RM 0.75/block');
    console.log('');
    console.log('  6. Siti Aminah (Seamstress)');
    console.log('     Email:    siti.aminah@example.com');
    console.log('     Password: worker123');
    console.log('     Rates:    RM 5.00/shirt, RM 7.50/pants');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📋 LEAVE TYPES CREATED:');
    console.log('  • Annual Leave (AL) - Tiered: 12/18/24 days');
    console.log('  • Sick Leave (SL) - 14 days');
    console.log('  • Emergency Leave (EL) - 5 days');
    console.log('  • Unpaid Leave (UL) - Unlimited');
    console.log('');
    console.log('🎉 GAZETTED HOLIDAYS:');
    console.log('  • 14 public holidays for 2025');
    console.log('');
    console.log('🏢 COMPANY QR CODE:');
    console.log(`  • ${company.qrCodeSettings.qrCode}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedPhase4();

