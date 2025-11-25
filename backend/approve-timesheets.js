require('dotenv').config();
const mongoose = require('mongoose');
const Timesheet = require('./src/models/timesheet.model');

async function approveTimesheets() {
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

    // Get users
    const subconAdmin = await User.findOne({ email: 'subcon.admin@example.com' });
    const admin = await User.findOne({ email: 'admin@payroll.com' });

    if (!subconAdmin || !admin) {
      console.log('✗ Users not found');
      process.exit(1);
    }

    console.log('1. Approving timesheets as Subcon Admin...');

    // Approve submitted timesheets as subcon-admin
    const submittedTimesheets = await Timesheet.find({ status: 'submitted' });
    for (const ts of submittedTimesheets) {
      ts.status = 'approved_subcon';
      ts.approvalHistory.push({
        approvedBy: subconAdmin._id,
        role: 'subcon-admin',
        status: 'approved',
        comments: 'Approved by subcon admin',
        timestamp: new Date()
      });
      await ts.save();
      console.log(`   ✓ Approved by subcon: Timesheet ${ts._id}`);
    }

    console.log('\n2. Approving timesheets as System Admin...');

    // Approve subcon-approved timesheets as admin
    const subconApprovedTimesheets = await Timesheet.find({ status: 'approved_subcon' });
    for (const ts of subconApprovedTimesheets) {
      ts.status = 'approved_admin';
      ts.approvalHistory.push({
        approvedBy: admin._id,
        role: 'admin',
        status: 'approved',
        comments: 'Final approval by system admin',
        timestamp: new Date()
      });
      await ts.save();
      console.log(`   ✓ Approved by admin: Timesheet ${ts._id}`);
    }

    console.log('\n✅ All timesheets approved!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total timesheets approved: ${submittedTimesheets.length + subconApprovedTimesheets.length}`);
    console.log('Status: approved_admin (ready for payroll processing)');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error approving timesheets:', error);
    process.exit(1);
  }
}

approveTimesheets();

