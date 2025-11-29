const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from backend folder
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

// Import models
const Worker = require('../backend/src/models/worker.model');
const Timesheet = require('../backend/src/models/timesheet.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll';

// Worker employee IDs from the screenshot
const WORKER_IDS = ['MS002', 'UB001', 'UB002', 'W001', 'W002', 'W003', 'W3242423'];

// Generate random time within a range
function randomTime(baseHour, baseMinute, varianceMinutes = 15) {
  const variance = Math.floor(Math.random() * varianceMinutes * 2) - varianceMinutes;
  const totalMinutes = baseHour * 60 + baseMinute + variance;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return { hour, minute };
}

// Check if date is weekend
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

// Get day of week string
function getDayOfWeek(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[date.getDay()];
  // Only return Mon-Fri for timesheets
  if (day === 'Sun' || day === 'Sat') return null;
  return day;
}

// Get week start (Monday) for a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

async function generateAttendanceData() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.substring(0, 30) + '...');

    mongoose.set('bufferCommands', false);

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');

    // Wait a bit for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Fetching workers...');
    // Fetch workers by employee IDs
    const workers = await Worker.find({
      employeeId: { $in: WORKER_IDS }
    }).select('_id employeeId firstName lastName company').lean().exec();

    console.log(`Found ${workers.length} workers`);

    if (workers.length === 0) {
      console.log('No workers found with the specified employee IDs');
      return;
    }

    // Generate data for last 3 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    // Some workers will have leave days (randomly assigned)
    const leaveDays = {};
    workers.forEach(worker => {
      leaveDays[worker._id.toString()] = [];
      // Randomly assign 2-5 leave days per worker over 3 months
      const numLeaveDays = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < numLeaveDays; i++) {
        const randomDay = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        if (!isWeekend(randomDay)) {
          leaveDays[worker._id.toString()].push(randomDay.toDateString());
        }
      }
    });

    console.log('\nGenerating attendance data...');
    let totalTimesheets = 0;

    // Group dates by week
    const weekMap = new Map();
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (!isWeekend(currentDate)) {
        const weekStart = getWeekStart(currentDate);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, []);
        }
        weekMap.get(weekKey).push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate timesheets for each worker and each week
    for (const worker of workers) {
      console.log(`\nGenerating attendance for ${worker.firstName} ${worker.lastName} (${worker.employeeId})`);

      for (const [weekKey, dates] of weekMap.entries()) {
        const weekStart = new Date(weekKey);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 4); // Friday

        // Check if timesheet already exists
        const existing = await Timesheet.findOne({
          worker: worker._id,
          weekStartDate: weekStart
        });

        if (existing) {
          console.log(`  Week ${weekKey}: Already exists, skipping`);
          continue;
        }

        const dailyEntries = [];
        let totalNormalHours = 0;
        let totalOT1_5Hours = 0;
        let totalHours = 0;

        for (const date of dates) {
          const dayOfWeek = getDayOfWeek(date);
          if (!dayOfWeek) continue;

          const isOnLeave = leaveDays[worker._id.toString()].includes(date.toDateString());

          // 95% attendance rate when not on leave
          const isPresent = !isOnLeave && Math.random() > 0.05;

          let entry = {
            date: date,
            dayOfWeek: dayOfWeek,
            isAbsent: !isPresent
          };

          if (isPresent) {
            // Clock in: 8:00 AM ± 15 minutes
            const clockInTime = randomTime(8, 0, 15);
            const clockIn = new Date(date);
            clockIn.setHours(clockInTime.hour, clockInTime.minute, 0, 0);

            // Lunch out: 12:00 PM ± 10 minutes
            const lunchOutTime = randomTime(12, 0, 10);
            const lunchOut = new Date(date);
            lunchOut.setHours(lunchOutTime.hour, lunchOutTime.minute, 0, 0);

            // Lunch in: 1:00 PM ± 10 minutes
            const lunchInTime = randomTime(13, 0, 10);
            const lunchIn = new Date(date);
            lunchIn.setHours(lunchInTime.hour, lunchInTime.minute, 0, 0);

            // Clock out: 5:00 PM ± 30 minutes (some overtime)
            const clockOutTime = randomTime(17, 0, 30);
            const clockOut = new Date(date);
            clockOut.setHours(clockOutTime.hour, clockOutTime.minute, 0, 0);

            // Calculate hours
            const workMinutes = (clockOut - clockIn) / (1000 * 60);
            const lunchMinutes = (lunchIn - lunchOut) / (1000 * 60);
            const netMinutes = workMinutes - lunchMinutes;
            const hours = netMinutes / 60;

            // Normal hours (up to 8)
            const normalHours = Math.min(hours, 8);
            // OT 1.5x (hours beyond 8)
            const ot1_5Hours = Math.max(0, hours - 8);

            totalNormalHours += normalHours;
            totalOT1_5Hours += ot1_5Hours;
            totalHours += hours;

            entry = {
              ...entry,
              clockIn,
              clockOut,
              lunchOut,
              lunchIn,
              normalHours: Math.round(normalHours * 100) / 100,
              ot1_5Hours: Math.round(ot1_5Hours * 100) / 100,
              ot2_0Hours: 0,
              totalHours: Math.round(hours * 100) / 100,
              checkInMethod: Math.random() > 0.3 ? 'qr-code' : 'manual',
              qrCodeCheckIn: Math.random() > 0.3 ? {
                scanned: true,
                scannedAt: clockIn,
                scannedBy: worker._id,
                qrCodeData: 'ABC-CONSTRUCTION-QR-001'
              } : undefined,
              qrCodeCheckOut: Math.random() > 0.3 ? {
                scanned: true,
                scannedAt: clockOut,
                scannedBy: worker._id,
                qrCodeData: 'ABC-CONSTRUCTION-QR-001'
              } : undefined
            };
          }

          dailyEntries.push(entry);
        }

        // Create timesheet
        const timesheet = new Timesheet({
          company: worker.company,
          worker: worker._id,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          dailyEntries,
          totalNormalHours: Math.round(totalNormalHours * 100) / 100,
          totalOT1_5Hours: Math.round(totalOT1_5Hours * 100) / 100,
          totalOT2_0Hours: 0,
          totalHours: Math.round(totalHours * 100) / 100,
          status: 'submitted',
          submittedAt: weekEnd,
          isDeleted: false
        });

        await timesheet.save();
        totalTimesheets++;
        console.log(`  Week ${weekKey}: Created (${dailyEntries.length} days)`);
      }
    }

    console.log(`\n✅ Successfully generated ${totalTimesheets} timesheets with attendance data`);
    console.log('\nSummary:');
    console.log(`- Workers: ${workers.length}`);
    console.log(`- Period: ${startDate.toDateString()} to ${endDate.toDateString()}`);
    console.log(`- Total timesheets created: ${totalTimesheets}`);

  } catch (error) {
    console.error('Error generating attendance data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
generateAttendanceData();

