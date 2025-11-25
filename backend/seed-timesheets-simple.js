require('dotenv').config();
const mongoose = require('mongoose');
const Timesheet = require('./src/models/timesheet.model');
const Worker = require('./src/models/worker.model');
const User = require('./src/models/users.model');

async function seed() {
  console.log('Starting seed...');

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll-system');
    console.log('Connected to MongoDB');

    // Get first user for createdBy
    const user = await User.findOne();
    if (!user) {
      console.log('ERROR: No users found! Please create a user first.');
      process.exit(1);
    }
    console.log(`Using user: ${user.email}`);

    // Get workers
    const workers = await Worker.find({ isActive: true }).limit(5);
    console.log(`Found ${workers.length} workers`);

    if (workers.length === 0) {
      console.log('ERROR: No workers found!');
      process.exit(1);
    }

    // Current week Monday
    const monday = new Date('2025-11-24T00:00:00.000Z');
    const friday = new Date('2025-11-28T23:59:59.999Z');

    console.log(`Week: ${monday.toISOString()} to ${friday.toISOString()}`);

    // Delete existing
    const deleted = await Timesheet.deleteMany({});
    console.log(`Deleted ${deleted.deletedCount} existing timesheets`);

    // Create timesheets
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      console.log(`\nCreating timesheet for ${worker.firstName} ${worker.lastName}...`);

      const dailyEntries = [];
      let totalNormal = 0;
      let totalOT1_5 = 0;
      let totalOT2_0 = 0;

      for (let day = 0; day < 5; day++) {
        const date = new Date(monday);
        date.setDate(date.getDate() + day);

        const normalHours = 8;
        const ot1_5Hours = Math.floor(Math.random() * 3);
        const ot2_0Hours = Math.random() > 0.7 ? 1 : 0;
        const totalHours = normalHours + ot1_5Hours + ot2_0Hours;

        const clockIn = new Date(date);
        clockIn.setHours(9, 0, 0, 0);

        const clockOut = new Date(date);
        clockOut.setHours(9 + totalHours, 0, 0, 0);

        dailyEntries.push({
          date: date,
          dayOfWeek: dayNames[day],
          clockIn: clockIn,
          clockOut: clockOut,
          normalHours: normalHours,
          ot1_5Hours: ot1_5Hours,
          ot2_0Hours: ot2_0Hours,
          totalHours: totalHours,
          checkInMethod: 'qr-code',
          qrCodeCheckIn: {
            scanned: true,
            scannedAt: new Date(clockIn.getTime() - 180000),
            qrCodeData: `QR-${worker.employeeId}-IN-${day}`
          },
          qrCodeCheckOut: {
            scanned: true,
            scannedAt: new Date(clockOut.getTime() + 180000),
            qrCodeData: `QR-${worker.employeeId}-OUT-${day}`
          },
          location: {
            clockIn: {
              latitude: 3.1390,
              longitude: 101.6869,
              address: 'Kuala Lumpur, Malaysia'
            },
            clockOut: {
              latitude: 3.1390,
              longitude: 101.6869,
              address: 'Kuala Lumpur, Malaysia'
            }
          },
          isAbsent: false
        });

        totalNormal += normalHours;
        totalOT1_5 += ot1_5Hours;
        totalOT2_0 += ot2_0Hours;

        console.log(`  ${dayNames[day]}: ${totalHours}h`);
      }

      const statuses = ['draft', 'submitted', 'approved_subcon', 'approved_admin'];
      const status = statuses[i % statuses.length];

      const timesheetData = {
        company: worker.company,
        worker: worker._id,
        weekStartDate: monday,
        weekEndDate: friday,
        dailyEntries: dailyEntries,
        totalNormalHours: totalNormal,
        totalOT1_5Hours: totalOT1_5,
        totalOT2_0Hours: totalOT2_0,
        totalHours: totalNormal + totalOT1_5 + totalOT2_0,
        status: status,
        isDeleted: false,
        createdBy: user._id,
        lastModifiedBy: user._id
      };

      const created = await Timesheet.create(timesheetData);
      console.log(`  Created timesheet ${created._id} with status: ${status}`);
      console.log(`  Total: ${totalNormal + totalOT1_5 + totalOT2_0}h`);
    }

    console.log('\n✅ Seeding completed successfully!');

    // Verify
    const count = await Timesheet.countDocuments({});
    console.log(`Total timesheets in DB: ${count}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seed();

