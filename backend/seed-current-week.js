require('dotenv').config();
const mongoose = require('mongoose');
const Timesheet = require('./src/models/timesheet.model');
const Worker = require('./src/models/worker.model');

async function seedCurrentWeek() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll-system');
    console.log('✅ Connected to MongoDB');

    // Get current week's Monday (Nov 24, 2025)
    const today = new Date('2025-11-24');
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    console.log(`📅 Creating timesheets for: ${monday.toDateString()} - ${friday.toDateString()}`);

    // Get workers
    const workers = await Worker.find({ isActive: true }).limit(5);
    console.log(`👥 Found ${workers.length} workers`);

    if (workers.length === 0) {
      console.log('❌ No workers found!');
      process.exit(1);
    }

    // Delete existing timesheets for this week
    await Timesheet.deleteMany({
      weekStartDate: { $gte: monday, $lte: friday }
    });
    console.log('🗑️  Cleared existing timesheets for this week');

    // Create timesheets for each worker
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const statuses = ['draft', 'submitted', 'approved_subcon', 'approved_admin'];

    for (const worker of workers) {
      console.log(`\n👤 Creating timesheet for ${worker.firstName} ${worker.lastName}...`);

      const dailyEntries = [];
      let totalNormal = 0;
      let totalOT1_5 = 0;
      let totalOT2_0 = 0;

      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const date = new Date(monday);
        date.setDate(date.getDate() + dayOffset);

        const clockIn = new Date(date);
        clockIn.setHours(9, 0, 0, 0);

        const clockOut = new Date(date);
        clockOut.setHours(18, 0, 0, 0);

        const normalHours = 8;
        const ot1_5Hours = Math.floor(Math.random() * 3);
        const ot2_0Hours = Math.random() > 0.7 ? 1 : 0;
        const totalHours = normalHours + ot1_5Hours + ot2_0Hours;

        clockOut.setHours(9 + totalHours, 0, 0, 0);

        const useQR = Math.random() > 0.3;
        const qrCheckIn = new Date(clockIn);
        qrCheckIn.setMinutes(-3);

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
            scannedAt: new Date(clockOut.getTime() + 180000),
            qrCodeData: `QR-${worker.employeeId}-${date.getTime()}-OUT`
          } : undefined,
          location: useQR ? {
            clockIn: {
              latitude: 3.1390,
              longitude: 101.6869,
              address: 'Kuala Lumpur, Malaysia',
              timestamp: qrCheckIn
            },
            clockOut: {
              latitude: 3.1390,
              longitude: 101.6869,
              address: 'Kuala Lumpur, Malaysia',
              timestamp: new Date(clockOut.getTime() + 180000)
            }
          } : undefined,
          isAbsent: false
        });

        totalNormal += normalHours;
        totalOT1_5 += ot1_5Hours;
        totalOT2_0 += ot2_0Hours;

        console.log(`  ✅ ${dayNames[dayOffset]}: ${normalHours}h + ${ot1_5Hours}h OT + ${ot2_0Hours}h OT2x = ${totalHours}h`);
      }

      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const timesheet = await Timesheet.create({
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
      });

      console.log(`  📊 Total: ${totalNormal + totalOT1_5 + totalOT2_0}h | Status: ${status}`);
    }

    console.log('\n✅ Seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedCurrentWeek();

