require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Worker = require('../src/models/worker.model');
const Timesheet = require('../src/models/timesheet.model');

// Create User model
const createUserModel = require('../src/models/users.model');
const app = {
  get(name) {
    if (name === 'mongooseClient') return mongoose;
    return null;
  }
};
const User = createUserModel(app);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll';

// Worker employee IDs from the screenshot
const WORKER_IDS = ['MS002', 'UB001', 'UB002', 'W001', 'W002', 'W003', 'W32423423'];

// Generate random time within a range
function randomTime(baseHour, baseMinute, varianceMinutes = 15) {
  const variance = Math.floor(Math.random() * varianceMinutes * 2) - varianceMinutes;
  const totalMinutes = baseHour * 60 + baseMinute + variance;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return { hour, minute };
}

// Check if date is Sunday (always excluded)
function isSunday(date) {
  return date.getDay() === 0;
}

// Check if date is Saturday
function isSaturday(date) {
  return date.getDay() === 6;
}

// Get day of week string
function getDayOfWeek(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

// Check if worker should work on this date
function shouldWorkOnDate(date, paymentType) {
  // Sunday is always off
  if (isSunday(date)) return false;

  // Hourly workers work Mon-Sat (6 days)
  if (paymentType === 'hourly') {
    return !isSunday(date);
  }

  // Other workers work Mon-Fri (5 days)
  return !isSunday(date) && !isSaturday(date);
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
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get a user to use as createdBy
    const user = await User.findOne({ role: { $in: ['admin', 'agent', 'subcon-admin'] } });
    if (!user) {
      console.log('No admin/agent/subcon-admin user found. Please create a user first.');
      return;
    }
    console.log(`Using user: ${user.email} as createdBy`);

    // Fetch workers by employee IDs with payment type
    const workers = await Worker.find({
      employeeId: { $in: WORKER_IDS }
    }).select('_id employeeId firstName lastName company paymentType');

    console.log(`Found ${workers.length} workers`);

    // Log payment types
    workers.forEach(w => {
      console.log(`  ${w.employeeId} (${w.firstName} ${w.lastName}): ${w.paymentType}`);
    });

    if (workers.length === 0) {
      console.log('No workers found with the specified employee IDs');
      return;
    }

    if (workers.length < 7) {
      console.log(`Warning: Only found ${workers.length} workers out of 7 expected`);
      console.log('Found workers:', workers.map(w => w.employeeId).join(', '));
      console.log('Expected:', WORKER_IDS.join(', '));
    }

    // Generate data for last 90 days (including weekends)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    startDate.setHours(0, 0, 0, 0);

    console.log('\nGenerating attendance data...');
    console.log(`Period: ${startDate.toDateString()} to ${endDate.toDateString()}`);

    let totalTimesheets = 0;

    // Build all dates (excluding Sundays)
    const allDates = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (!isSunday(currentDate)) {
        allDates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Total dates (Mon-Sat): ${allDates.length}`);

    // Generate timesheets for each worker
    let recordCount = 0;
    for (const worker of workers) {
      const isHourly = worker.paymentType === 'hourly';
      const workDays = isHourly ? 6 : 5;
      console.log(`\nGenerating attendance for ${worker.firstName} ${worker.lastName} (${worker.employeeId}) - ${worker.paymentType} (${workDays} days/week)`);

      // Filter dates for this worker based on payment type
      const workerDates = allDates.filter(date => shouldWorkOnDate(date, worker.paymentType));

      // Group by week
      const weekMap = new Map();
      for (const date of workerDates) {
        const weekStart = getWeekStart(date);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, []);
        }
        weekMap.get(weekKey).push(date);
      }

      for (const [weekKey, dates] of weekMap.entries()) {
        const weekStart = new Date(weekKey);
        const weekEnd = new Date(weekStart);
        // Week end depends on payment type: Sat for hourly, Fri for others
        weekEnd.setDate(weekEnd.getDate() + (isHourly ? 5 : 4));

        // Check if timesheet already exists
        const existing = await Timesheet.findOne({
          worker: worker._id,
          weekStartDate: weekStart
        });

        if (existing) {
          console.log(`  Week ${weekKey}: Already exists, skipping`);
          recordCount += existing.dailyEntries.length;
          continue;
        }

        const dailyEntries = [];
        let totalNormalHours = 0;
        let totalOT1_5Hours = 0;
        let totalHours = 0;

        // Randomly select 2-3 days for leave (MC, PH, AL) per worker per 90 days
        const leaveTypes = ['MC', 'PH', 'AL'];
        const leaveDaysCount = Math.floor(Math.random() * 2) + 2; // 2-3 leave days
        const leaveDayIndices = new Set();

        while (leaveDayIndices.size < Math.min(leaveDaysCount, dates.length)) {
          leaveDayIndices.add(Math.floor(Math.random() * dates.length));
        }

        for (let i = 0; i < dates.length; i++) {
          const date = dates[i];
          const dayOfWeek = getDayOfWeek(date);

          // Skip if not a valid work day for this worker
          if (!shouldWorkOnDate(date, worker.paymentType)) continue;

          // Check if this is a leave day
          const isLeaveDay = leaveDayIndices.has(i);
          const leaveType = isLeaveDay ? leaveTypes[Math.floor(Math.random() * leaveTypes.length)] : null;

          let entry = {
            date: date,
            dayOfWeek: dayOfWeek,
            isAbsent: isLeaveDay,
            leaveType: leaveType
          };

          if (!isLeaveDay) {
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
          } else {
            // Leave day - no clock in/out
            entry = {
              ...entry,
              normalHours: 0,
              ot1_5Hours: 0,
              ot2_0Hours: 0,
              totalHours: 0
            };
          }

          dailyEntries.push(entry);
          recordCount++;
        }

        // Create timesheet with approved status (since these are past records)
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
          status: 'approved_admin',
          submittedAt: weekEnd,
          approvedBySubcon: user._id,
          approvedBySubconAt: new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000), // Approved 1 day after week end
          approvedByAdmin: user._id,
          approvedByAdminAt: new Date(weekEnd.getTime() + 48 * 60 * 60 * 1000), // Approved 2 days after week end
          createdBy: user._id,
          isDeleted: false
        });

        await timesheet.save();
        totalTimesheets++;
        console.log(`  Week ${weekKey}: Created (${dailyEntries.length} days)`);
      }

      console.log(`  Total records for ${worker.employeeId}: ${workerDates.length} days`);
    }

    console.log(`\n✅ Successfully generated ${totalTimesheets} timesheets with attendance data`);
    console.log('\n=== SUMMARY ===');
    console.log(`Workers: ${workers.length}`);
    console.log(`Period: ${startDate.toDateString()} to ${endDate.toDateString()}`);
    console.log(`Total timesheets created: ${totalTimesheets}`);
    console.log(`Total attendance records: ${recordCount}`);

  } catch (error) {
    console.error('Error generating attendance data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
generateAttendanceData();

