require('dotenv').config();
const mongoose = require('mongoose');
const Timesheet = require('../src/models/timesheet.model.js');
const LeaveRequest = require('../src/models/leave-request.model.js');
const LeaveType = require('../src/models/leave-type.model.js');

// Helper function to get Monday of the week for a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Helper function to get Friday of the week for a given date
function getWeekEnd(date) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);
  return weekEnd;
}

// Helper function to check if a date falls within a range
function isDateInRange(date, startDate, endDate) {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  return checkDate >= start && checkDate <= end;
}

async function updateTimesheetsWithAttendance(weekStartDate = null) {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Use provided date or current week
    const targetDate = weekStartDate ? new Date(weekStartDate) : new Date();
    const weekStart = getWeekStart(targetDate);
    const weekEnd = getWeekEnd(targetDate);
    
    console.log(`\n📅 Updating timesheets for week: ${weekStart.toDateString()} - ${weekEnd.toDateString()}`);

    // Find all timesheets for this week
    console.log('\n🔍 Finding timesheets for the week...');
    const timesheets = await Timesheet.find({
      weekStartDate: weekStart
    }).populate('worker');

    console.log(`📊 Found ${timesheets.length} timesheets to update`);

    // Find all approved leave requests that overlap with this week
    console.log('\n🔍 Finding approved leave requests...');
    const leaveRequests = await LeaveRequest.find({
      status: 'approved',
      $or: [
        {
          startDate: { $lte: weekEnd },
          endDate: { $gte: weekStart }
        }
      ]
    }).populate('worker').populate('leaveType');

    console.log(`📊 Found ${leaveRequests.length} approved leave requests`);

    let updatedCount = 0;
    let leaveUpdatesCount = 0;

    for (const timesheet of timesheets) {
      try {
        let hasUpdates = false;

        // Check for leave requests for this worker
        const workerLeaveRequests = leaveRequests.filter(
          leave => leave.worker._id.toString() === timesheet.worker._id.toString()
        );

        if (workerLeaveRequests.length > 0) {
          console.log(`\n📋 Processing leave for ${timesheet.worker.firstName} ${timesheet.worker.lastName}`);
          
          // Update daily entries with leave information
          for (const dailyEntry of timesheet.dailyEntries) {
            const entryDate = new Date(dailyEntry.date);
            
            // Check if this date falls within any leave request
            for (const leaveRequest of workerLeaveRequests) {
              if (isDateInRange(entryDate, leaveRequest.startDate, leaveRequest.endDate)) {
                console.log(`  📅 Marking ${entryDate.toDateString()} as ${leaveRequest.leaveType.code} leave`);
                
                dailyEntry.isAbsent = true;
                dailyEntry.leaveType = leaveRequest.leaveType.code;
                dailyEntry.clockIn = null;
                dailyEntry.clockOut = null;
                dailyEntry.normalHours = 0;
                dailyEntry.ot1_5Hours = 0;
                dailyEntry.ot2_0Hours = 0;
                dailyEntry.totalHours = 0;
                
                hasUpdates = true;
                leaveUpdatesCount++;
                break; // Only apply first matching leave request
              }
            }
          }
        }

        // Recalculate totals
        if (hasUpdates) {
          timesheet.totalNormalHours = timesheet.dailyEntries.reduce((sum, entry) => sum + entry.normalHours, 0);
          timesheet.totalOT1_5Hours = timesheet.dailyEntries.reduce((sum, entry) => sum + entry.ot1_5Hours, 0);
          timesheet.totalOT2_0Hours = timesheet.dailyEntries.reduce((sum, entry) => sum + entry.ot2_0Hours, 0);
          timesheet.totalHours = timesheet.dailyEntries.reduce((sum, entry) => sum + entry.totalHours, 0);

          await timesheet.save();
          console.log(`✅ Updated timesheet for ${timesheet.worker.firstName} ${timesheet.worker.lastName}`);
          updatedCount++;
        }

      } catch (error) {
        console.error(`❌ Error updating timesheet for ${timesheet.worker.firstName} ${timesheet.worker.lastName}:`, error.message);
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`- Timesheets processed: ${timesheets.length}`);
    console.log(`- Timesheets updated: ${updatedCount}`);
    console.log(`- Leave entries applied: ${leaveUpdatesCount}`);
    console.log(`- Week: ${weekStart.toDateString()} - ${weekEnd.toDateString()}`);

    console.log('\n✅ Timesheet attendance update completed!');

  } catch (error) {
    console.error('❌ Error updating timesheets with attendance:', error);
    process.exit(1);
  } finally {
    console.log('\n🔌 Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Export for use in other scripts
module.exports = { updateTimesheetsWithAttendance };

// Run if called directly
if (require.main === module) {
  const weekStartDate = process.argv[2]; // Optional: pass week start date as argument
  updateTimesheetsWithAttendance(weekStartDate);
}
