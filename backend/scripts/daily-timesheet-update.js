require('dotenv').config();
const mongoose = require('mongoose');
const Timesheet = require('../src/models/timesheet.model.js');
const Worker = require('../src/models/worker.model.js');
const Company = require('../src/models/company.model.js');

// Helper function to get today's date
function getTodayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// Helper function to get Monday of the week for a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Helper function to calculate hours between two times
function calculateHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return { normal: 0, ot1_5: 0, ot2_0: 0 };

  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const totalMinutes = (end - start) / (1000 * 60);
  const totalHours = totalMinutes / 60;

  // Standard work day is 8 hours
  const standardHours = 8;

  if (totalHours <= standardHours) {
    return { normal: totalHours, ot1_5: 0, ot2_0: 0 };
  } else if (totalHours <= 10) {
    // First 2 hours of OT at 1.5x
    return { normal: standardHours, ot1_5: totalHours - standardHours, ot2_0: 0 };
  } else {
    // First 2 hours at 1.5x, rest at 2.0x
    return { normal: standardHours, ot1_5: 2, ot2_0: totalHours - 10 };
  }
}

async function updateDailyTimesheets(targetDate = null) {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Use provided date or today
    const updateDate = targetDate ? new Date(targetDate) : getTodayDate();
    const weekStart = getWeekStart(updateDate);

    console.log(`\n📅 Updating timesheets for date: ${updateDate.toDateString()}`);
    console.log(`📅 Week starting: ${weekStart.toDateString()}`);

    // Find all timesheets for this week
    console.log('\n🔍 Finding timesheets for the week...');
    const timesheets = await Timesheet.find({
      weekStartDate: weekStart
    }).populate('worker');

    console.log(`📊 Found ${timesheets.length} timesheets to check`);

    let updatedCount = 0;

    for (const timesheet of timesheets) {
      try {
        // Find the daily entry for the target date
        const dailyEntry = timesheet.dailyEntries.find(entry => {
          const entryDate = new Date(entry.date);
          const targetDate = new Date(updateDate);

          // Compare just the date parts (ignore time and timezone)
          return entryDate.getFullYear() === targetDate.getFullYear() &&
                 entryDate.getMonth() === targetDate.getMonth() &&
                 entryDate.getDate() === targetDate.getDate();
        });

        if (!dailyEntry) {
          console.log(`⏭️  No entry found for ${timesheet.worker.firstName} ${timesheet.worker.lastName} on ${updateDate.toDateString()}`);
          continue;
        }

        // Skip if already has attendance data or is marked as absent/leave
        if (dailyEntry.clockIn || dailyEntry.isAbsent || dailyEntry.leaveType) {
          console.log(`⏭️  ${timesheet.worker.firstName} ${timesheet.worker.lastName} already has data for ${updateDate.toDateString()}`);
          continue;
        }

        // For demonstration, we'll simulate attendance data
        // In a real system, this would come from an attendance system
        const dayOfWeek = updateDate.getDay();
        const isWorkDay = (timesheet.worker.paymentType === 'hourly' && dayOfWeek >= 1 && dayOfWeek <= 6) ||
                         (timesheet.worker.paymentType === 'monthly' && dayOfWeek >= 1 && dayOfWeek <= 5);

        if (isWorkDay) {
          // Simulate clock in/out times (8 AM to 5 PM with 1 hour lunch)
          const clockInTime = new Date(updateDate);
          clockInTime.setHours(8, 0, 0, 0);

          const clockOutTime = new Date(updateDate);
          clockOutTime.setHours(17, 0, 0, 0);

          // Calculate hours
          const hours = calculateHours(clockInTime, clockOutTime);

          // Update daily entry
          dailyEntry.clockIn = clockInTime;
          dailyEntry.clockOut = clockOutTime;
          dailyEntry.normalHours = hours.normal;
          dailyEntry.ot1_5Hours = hours.ot1_5;
          dailyEntry.ot2_0Hours = hours.ot2_0;
          dailyEntry.totalHours = hours.normal + hours.ot1_5 + hours.ot2_0;
          dailyEntry.checkInMethod = 'manual';

          console.log(`✅ Updated attendance for ${timesheet.worker.firstName} ${timesheet.worker.lastName}: ${hours.normal}h normal`);
          updatedCount++;
        }

        // Recalculate totals
        timesheet.totalNormalHours = timesheet.dailyEntries.reduce((sum, entry) => sum + entry.normalHours, 0);
        timesheet.totalOT1_5Hours = timesheet.dailyEntries.reduce((sum, entry) => sum + entry.ot1_5Hours, 0);
        timesheet.totalOT2_0Hours = timesheet.dailyEntries.reduce((sum, entry) => sum + entry.ot2_0Hours, 0);
        timesheet.totalHours = timesheet.dailyEntries.reduce((sum, entry) => sum + entry.totalHours, 0);

        await timesheet.save();

      } catch (error) {
        console.error(`❌ Error updating timesheet for ${timesheet.worker.firstName} ${timesheet.worker.lastName}:`, error.message);
      }
    }

    console.log('\n📊 Daily Update Summary:');
    console.log(`- Timesheets processed: ${timesheets.length}`);
    console.log(`- Attendance records updated: ${updatedCount}`);
    console.log(`- Date: ${updateDate.toDateString()}`);

    console.log('\n✅ Daily timesheet update completed!');

  } catch (error) {
    console.error('❌ Error updating daily timesheets:', error);
    process.exit(1);
  } finally {
    console.log('\n🔌 Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Export for use in other scripts
module.exports = { updateDailyTimesheets };

// Run if called directly
if (require.main === module) {
  const targetDate = process.argv[2]; // Optional: pass date as argument (YYYY-MM-DD)

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
📊 Daily Timesheet Update Script

Usage:
  node daily-timesheet-update.js [date]

Examples:
  node daily-timesheet-update.js                    # Update for today
  node daily-timesheet-update.js 2025-11-29        # Update for specific date

Date format: YYYY-MM-DD
    `);
    process.exit(0);
  }

  updateDailyTimesheets(targetDate);
}
