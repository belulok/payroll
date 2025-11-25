require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Company = require('./src/models/company.model');
const Worker = require('./src/models/worker.model');
const Timesheet = require('./src/models/timesheet.model');

async function seedPhase2() {
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
      isActive: { type: Boolean, default: true },
      employeeId: { type: String, unique: true, sparse: true },
      department: String,
      position: String,
      hireDate: Date,
      salary: Number
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

    // 2. Create Test Timesheets
    console.log('\n2. Creating Test Timesheets...');

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const timesheetData = [
      // Worker 1 (Ahmad) - Yesterday - Submitted
      {
        company: company._id,
        worker: workers[0]._id,
        date: yesterday,
        clockIn: new Date(yesterday.setHours(8, 0, 0, 0)),
        clockOut: new Date(yesterday.setHours(17, 0, 0, 0)),
        normalHours: 8,
        ot1_5Hours: 1,
        ot2_0Hours: 0,
        totalHours: 9,
        status: 'submitted',
        description: 'Foundation work at Site A',
        createdBy: subconAdmin._id
      },
      // Worker 1 (Ahmad) - Two days ago - Approved by subcon
      {
        company: company._id,
        worker: workers[0]._id,
        date: twoDaysAgo,
        clockIn: new Date(twoDaysAgo.setHours(8, 0, 0, 0)),
        clockOut: new Date(twoDaysAgo.setHours(18, 0, 0, 0)),
        normalHours: 8,
        ot1_5Hours: 2,
        ot2_0Hours: 0,
        totalHours: 10,
        status: 'approved_subcon',
        description: 'Concrete pouring',
        createdBy: subconAdmin._id,
        approvalHistory: [{
          approvedBy: subconAdmin._id,
          role: 'subcon-admin',
          status: 'approved',
          comments: 'Approved',
          timestamp: new Date()
        }]
      },
      // Worker 2 (Kumar) - Yesterday - Submitted
      {
        company: company._id,
        worker: workers[1]._id,
        date: yesterday,
        clockIn: new Date(yesterday.setHours(7, 30, 0, 0)),
        clockOut: new Date(yesterday.setHours(19, 0, 0, 0)),
        normalHours: 8,
        ot1_5Hours: 2,
        ot2_0Hours: 1.5,
        totalHours: 11.5,
        status: 'submitted',
        description: 'Site supervision - overtime for urgent work',
        createdBy: subconAdmin._id
      },
      // Worker 3 (Lee) - Yesterday - Draft
      {
        company: company._id,
        worker: workers[2]._id,
        date: yesterday,
        clockIn: new Date(yesterday.setHours(8, 0, 0, 0)),
        clockOut: new Date(yesterday.setHours(16, 30, 0, 0)),
        normalHours: 8,
        ot1_5Hours: 0.5,
        ot2_0Hours: 0,
        totalHours: 8.5,
        status: 'draft',
        description: 'Electrical wiring installation',
        createdBy: subconAdmin._id
      }
    ];

    for (const data of timesheetData) {
      const existing = await Timesheet.findOne({
        company: data.company,
        worker: data.worker,
        date: data.date
      });

      if (!existing) {
        await Timesheet.create(data);
        const worker = workers.find(w => w._id.toString() === data.worker.toString());
        console.log(`   ✓ Timesheet created: ${worker.firstName} ${worker.lastName} - ${data.date.toDateString()} (${data.status})`);
      } else {
        const worker = workers.find(w => w._id.toString() === data.worker.toString());
        console.log(`   ✓ Timesheet already exists: ${worker.firstName} ${worker.lastName} - ${data.date.toDateString()}`);
      }
    }

    console.log('\n✅ Phase 2 Seed Complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('TEST TIMESHEETS CREATED:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n4 timesheets created with different statuses:');
    console.log('  - 2 Submitted (awaiting subcon approval)');
    console.log('  - 1 Approved by Subcon (awaiting admin approval)');
    console.log('  - 1 Draft');
    console.log('\nTimesheet includes:');
    console.log('  - Normal hours (8 hours)');
    console.log('  - OT 1.5x hours');
    console.log('  - OT 2.0x hours');
    console.log('  - Work descriptions');
    console.log('\n═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedPhase2();

