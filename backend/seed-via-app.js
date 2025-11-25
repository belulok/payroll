const app = require('./src/app');
const mongoose = require('mongoose');

async function seed() {
  try {
    console.log('🌱 Seeding timesheets via Feathers app...\n');

    // Get services
    const workersService = app.service('workers');
    const timesheetsService = app.service('timesheets');
    const usersService = app.service('users');

    // Get first user
    const usersResult = await usersService.find({ query: { $limit: 1 } });
    const users = usersResult.data || usersResult;
    
    if (users.length === 0) {
      console.log('❌ No users found!');
      process.exit(1);
    }

    const user = users[0];
    console.log(`👤 Using user: ${user.email}\n`);

    // Get workers
    const workersResult = await workersService.find({ query: { $limit: 5, isActive: true } });
    const workers = workersResult.data || workersResult;
    
    console.log(`👥 Found ${workers.length} workers\n`);

    // Current week
    const monday = new Date('2025-11-24T00:00:00.000Z');
    const friday = new Date('2025-11-28T23:59:59.999Z');
    
    console.log(`📅 Week: ${monday.toDateString()} - ${friday.toDateString()}\n`);

    // Delete existing timesheets for this week
    const Timesheet = mongoose.model('timesheets');
    const deleted = await Timesheet.deleteMany({
      weekStartDate: { $gte: monday, $lte: friday }
    });
    console.log(`🗑️  Deleted ${deleted.deletedCount} existing timesheets\n`);

    // Create timesheets
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const statuses = ['draft', 'submitted', 'approved_subcon', 'approved_admin'];

    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      console.log(`Creating timesheet for ${worker.firstName} ${worker.lastName}...`);

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
      }

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
        isDeleted: false
      };

      await timesheetsService.create(timesheetData, {
        user: user,
        authenticated: true
      });

      console.log(`  ✅ Created with status: ${status} | Total: ${totalNormal + totalOT1_5 + totalOT2_0}h\n`);
    }

    console.log('✅ Seeding completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seed();

