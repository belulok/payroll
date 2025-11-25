const mongoose = require('mongoose');
const app = require('./src/app');

async function seedWeeklyTimesheets() {
  try {
    console.log('🌱 Starting weekly timesheet seeding...');

    // Get services
    const workersService = app.service('workers');
    const timesheetsService = app.service('timesheets');
    const usersService = app.service('users');

    // Get first user (admin) to use as creator
    const users = await usersService.find({ query: { $limit: 1 } });
    const usersList = users.data || users;
    
    if (usersList.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }

    const adminUser = usersList[0];
    console.log(`👤 Using user: ${adminUser.email}`);

    // Get all workers
    const workers = await workersService.find({ query: { $limit: 100 } });
    const workersList = workers.data || workers;

    if (workersList.length === 0) {
      console.log('❌ No workers found. Please seed workers first.');
      return;
    }

    console.log(`📋 Found ${workersList.length} workers`);

    // Delete existing timesheets first
    const Timesheet = mongoose.model('timesheets');
    await Timesheet.deleteMany({});
    console.log('🗑️  Cleared existing timesheets');

    // Get current week's Monday
    const today = new Date();
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    console.log(`📅 Seeding timesheets for week: ${monday.toDateString()} - ${friday.toDateString()}`);

    // Create weekly timesheets for each worker
    for (const worker of workersList.slice(0, 5)) { // Seed for first 5 workers
      console.log(`\n👤 Creating weekly timesheet for ${worker.firstName} ${worker.lastName}...`);

      const dailyEntries = [];
      let totalNormal = 0;
      let totalOT1_5 = 0;
      let totalOT2_0 = 0;

      // Create entries for Mon-Fri
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const date = new Date(monday);
        date.setDate(date.getDate() + dayOffset);

        // Random: some days might be absent
        const isAbsent = Math.random() > 0.85;
        
        if (isAbsent) {
          dailyEntries.push({
            date: date,
            dayOfWeek: dayNames[dayOffset],
            isAbsent: true,
            normalHours: 0,
            ot1_5Hours: 0,
            ot2_0Hours: 0,
            totalHours: 0
          });
          console.log(`  ❌ ${dayNames[dayOffset]}: Absent`);
          continue;
        }

        const clockIn = new Date(date);
        clockIn.setHours(9, 0, 0, 0);

        const clockOut = new Date(date);
        clockOut.setHours(18, 0, 0, 0);

        // Randomize some data
        const hasOT = Math.random() > 0.6;
        const normalHours = 8;
        const ot1_5Hours = hasOT ? Math.floor(Math.random() * 3) + 1 : 0;
        const ot2_0Hours = hasOT && Math.random() > 0.7 ? Math.floor(Math.random() * 2) : 0;
        const totalHours = normalHours + ot1_5Hours + ot2_0Hours;

        // Adjust clock out time based on total hours
        clockOut.setHours(9 + totalHours, 0, 0, 0);

        // Random QR code usage
        const useQR = Math.random() > 0.3;

        const qrCheckIn = new Date(clockIn);
        qrCheckIn.setMinutes(qrCheckIn.getMinutes() - Math.floor(Math.random() * 5));

        const qrCheckOut = new Date(clockOut);
        qrCheckOut.setMinutes(qrCheckOut.getMinutes() + Math.floor(Math.random() * 5));

        dailyEntries.push({
          date: date,
          dayOfWeek: dayNames[dayOffset],
          clockIn: clockIn,
          clockOut: clockOut,
          normalHours,
          ot1_5Hours,
          ot2_0Hours,
          totalHours,
          checkInMethod: useQR ? 'qr-code' : 'manual',
          qrCodeCheckIn: useQR ? {
            scanned: true,
            scannedAt: qrCheckIn,
            qrCodeData: `QR-${worker.employeeId}-${date.getTime()}`
          } : undefined,
          qrCodeCheckOut: useQR ? {
            scanned: true,
            scannedAt: qrCheckOut,
            qrCodeData: `QR-${worker.employeeId}-${date.getTime()}-OUT`
          } : undefined,
          location: useQR ? {
            clockIn: {
              latitude: 3.1390 + (Math.random() - 0.5) * 0.1,
              longitude: 101.6869 + (Math.random() - 0.5) * 0.1,
              address: 'Kuala Lumpur, Malaysia',
              timestamp: qrCheckIn
            },
            clockOut: {
              latitude: 3.1390 + (Math.random() - 0.5) * 0.1,
              longitude: 101.6869 + (Math.random() - 0.5) * 0.1,
              address: 'Kuala Lumpur, Malaysia',
              timestamp: qrCheckOut
            }
          } : undefined,
          isAbsent: false
        });

        totalNormal += normalHours;
        totalOT1_5 += ot1_5Hours;
        totalOT2_0 += ot2_0Hours;

        console.log(`  ✅ ${dayNames[dayOffset]}: ${normalHours}h + ${ot1_5Hours}h OT1.5x + ${ot2_0Hours}h OT2.0x = ${totalHours}h`);
      }

      // Random status for the entire week
      const statuses = ['submitted', 'approved_subcon', 'approved_admin', 'draft'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const weeklyTimesheetData = {
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

      await timesheetsService.create(weeklyTimesheetData, {
        user: adminUser,
        authenticated: true
      });

      console.log(`  📊 Week Total: ${totalNormal}h normal + ${totalOT1_5}h OT1.5x + ${totalOT2_0}h OT2.0x = ${totalNormal + totalOT1_5 + totalOT2_0}h`);
      console.log(`  📝 Status: ${status}`);
    }

    console.log('\n✅ Weekly timesheet seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding weekly timesheets:', error);
    process.exit(1);
  }
}

// Run the seed function
seedWeeklyTimesheets();

