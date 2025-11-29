require('dotenv').config();
const mongoose = require('mongoose');
const Timesheet = require('../src/models/timesheet.model.js');
const Worker = require('../src/models/worker.model.js');
const Company = require('../src/models/company.model.js');

// Helper function to get Monday of the week for a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Helper function to get Sunday of the week for a given date
function getWeekEnd(date) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday (Mon + 6 days)
  return weekEnd;
}

// Helper function to get day name
function getDayName(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

async function addWeekendToTimesheets() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all timesheets that might be missing weekend days
    console.log('\n🔍 Finding timesheets to update...');
    const timesheets = await Timesheet.find({}).populate('worker');

    console.log(`📊 Found ${timesheets.length} timesheets to check`);

    let updatedCount = 0;

    for (const timesheet of timesheets) {
      try {
        const weekStart = new Date(timesheet.weekStartDate);
        const weekEnd = getWeekEnd(weekStart);
        
        // Check if we have all 7 days (Mon-Sun)
        const existingDays = timesheet.dailyEntries.map(entry => {
          const date = new Date(entry.date);
          return date.getDay(); // 0=Sunday, 1=Monday, etc.
        });

        const allDays = [1, 2, 3, 4, 5, 6, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
        const missingDays = allDays.filter(day => !existingDays.includes(day));

        if (missingDays.length > 0) {
          console.log(`\n📅 Adding missing days for ${timesheet.worker.firstName} ${timesheet.worker.lastName}`);
          console.log(`   Missing days: ${missingDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`);

          // Add missing days
          for (const dayOfWeek of missingDays) {
            // Calculate the date for this day of week
            const dayDate = new Date(weekStart);
            const daysToAdd = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 6 days after Monday
            dayDate.setDate(weekStart.getDate() + daysToAdd);

            const newEntry = {
              date: dayDate,
              dayOfWeek: getDayName(dayDate),
              clockIn: null,
              clockOut: null,
              normalHours: 0,
              ot1_5Hours: 0,
              ot2_0Hours: 0,
              totalHours: 0,
              checkInMethod: 'manual',
              isAbsent: false,
              leaveType: null
            };

            timesheet.dailyEntries.push(newEntry);
            console.log(`   ✅ Added ${getDayName(dayDate)} (${dayDate.toDateString()})`);
          }

          // Sort daily entries by date
          timesheet.dailyEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

          // Update week end date to Sunday
          timesheet.weekEndDate = weekEnd;

          await timesheet.save();
          updatedCount++;
          console.log(`   💾 Saved timesheet for ${timesheet.worker.firstName} ${timesheet.worker.lastName}`);
        } else {
          console.log(`✅ ${timesheet.worker.firstName} ${timesheet.worker.lastName} already has all 7 days`);
        }

      } catch (error) {
        console.error(`❌ Error updating timesheet for ${timesheet.worker.firstName} ${timesheet.worker.lastName}:`, error.message);
      }
    }

    console.log('\n📊 Weekend Addition Summary:');
    console.log(`- Timesheets checked: ${timesheets.length}`);
    console.log(`- Timesheets updated: ${updatedCount}`);
    console.log(`- Timesheets already complete: ${timesheets.length - updatedCount}`);

    console.log('\n✅ Weekend addition completed!');

  } catch (error) {
    console.error('❌ Error adding weekends to timesheets:', error);
    process.exit(1);
  } finally {
    console.log('\n🔌 Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Export for use in other scripts
module.exports = { addWeekendToTimesheets };

// Run if called directly
if (require.main === module) {
  addWeekendToTimesheets();
}
