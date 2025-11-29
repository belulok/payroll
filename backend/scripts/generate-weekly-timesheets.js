require('dotenv').config();
const mongoose = require('mongoose');
const Timesheet = require('../src/models/timesheet.model.js');
const Worker = require('../src/models/worker.model.js');
const Task = require('../src/models/task.model.js');
const LeaveRequest = require('../src/models/leave-request.model.js');
const Company = require('../src/models/company.model.js');
// Create User model
const createUserModel = require('../src/models/users.model.js');
const app = {
  get(name) {
    if (name === 'mongooseClient') return mongoose;
    return null;
  }
};

// Helper function to get Monday of the week for a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Helper function to get Sunday of the week for a given date
function getWeekEnd(date) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday (Mon + 6 days)
  return weekEnd;
}

// Helper function to check if worker should work on a specific date
function shouldWorkOnDate(date, paymentType) {
  const dayOfWeek = date.getDay();

  if (paymentType === 'hourly') {
    // Hourly workers work Mon-Sat (1-6)
    return dayOfWeek >= 1 && dayOfWeek <= 6;
  } else {
    // Monthly/office workers work Mon-Fri (1-5)
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
}

// Helper function to get day name
function getDayName(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

async function generateWeeklyTimesheets(weekStartDate = null) {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Use provided date or current week
    const targetDate = weekStartDate ? new Date(weekStartDate) : new Date();
    const weekStart = getWeekStart(targetDate);
    const weekEnd = getWeekEnd(targetDate);

    console.log(`\n📅 Generating timesheets for week: ${weekStart.toDateString()} - ${weekEnd.toDateString()}`);

    // Find Manual Labour task
    const manualLabourTask = await Task.findOne({ taskId: 'ManLab' });
    if (!manualLabourTask) {
      console.error('❌ Manual Labour task not found! Please create it first.');
      process.exit(1);
    }

    // Create User model and find a system user for created by field
    const User = createUserModel(app);
    const systemUser = await User.findOne({ role: 'admin' });
    if (!systemUser) {
      console.error('❌ No admin user found for system operations!');
      process.exit(1);
    }

    // Get all active workers
    console.log('\n🔍 Finding active workers...');
    const workers = await Worker.find({
      isActive: true,
      employmentStatus: 'active'
    }).populate('company');

    console.log(`📊 Found ${workers.length} active workers`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const worker of workers) {
      try {
        // Check if timesheet already exists for this worker and week
        const existingTimesheet = await Timesheet.findOne({
          worker: worker._id,
          weekStartDate: weekStart
        });

        if (existingTimesheet) {
          console.log(`⏭️  Timesheet already exists for ${worker.firstName} ${worker.lastName} (${worker.employeeId})`);
          skippedCount++;
          continue;
        }

        // Generate daily entries for the week (Mon-Sun, all 7 days)
        const dailyEntries = [];
        const currentDate = new Date(weekStart);

        while (currentDate <= weekEnd) {
          // Create entry for every day of the week (Mon-Sun)
          dailyEntries.push({
            date: new Date(currentDate),
            dayOfWeek: getDayName(currentDate),
            clockIn: null,
            clockOut: null,
            normalHours: 0,
            ot1_5Hours: 0,
            ot2_0Hours: 0,
            totalHours: 0,
            checkInMethod: 'manual',
            isAbsent: false,
            leaveType: null
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Create timesheet
        const timesheet = new Timesheet({
          company: worker.company._id,
          worker: worker._id,
          task: manualLabourTask._id,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          dailyEntries: dailyEntries,
          totalNormalHours: 0,
          totalOT1_5Hours: 0,
          totalOT2_0Hours: 0,
          totalHours: 0,
          status: 'draft',
          createdBy: systemUser._id,
          isDeleted: false
        });

        await timesheet.save();
        console.log(`✅ Created timesheet for ${worker.firstName} ${worker.lastName} (${worker.employeeId})`);
        createdCount++;

      } catch (error) {
        console.error(`❌ Error creating timesheet for ${worker.firstName} ${worker.lastName}:`, error.message);
      }
    }

    console.log('\n📊 Generation Summary:');
    console.log(`- Workers processed: ${workers.length}`);
    console.log(`- Timesheets created: ${createdCount}`);
    console.log(`- Timesheets skipped (already exist): ${skippedCount}`);
    console.log(`- Week: ${weekStart.toDateString()} - ${weekEnd.toDateString()}`);

    console.log('\n✅ Weekly timesheet generation completed!');

  } catch (error) {
    console.error('❌ Error generating weekly timesheets:', error);
    process.exit(1);
  } finally {
    console.log('\n🔌 Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Export for use in other scripts
module.exports = { generateWeeklyTimesheets };

// Run if called directly
if (require.main === module) {
  const weekStartDate = process.argv[2]; // Optional: pass week start date as argument
  generateWeeklyTimesheets(weekStartDate);
}
