require('dotenv').config();
const { generateWeeklyTimesheets } = require('./generate-weekly-timesheets.js');
const { updateTimesheetsWithAttendance } = require('./update-timesheets-with-attendance.js');

/**
 * Complete weekly timesheet automation
 * 1. Generates timesheets for all active workers
 * 2. Updates them with attendance and leave data
 */
async function runWeeklyTimesheetAutomation(weekStartDate = null) {
  try {
    console.log('🚀 Starting Weekly Timesheet Automation...');
    console.log('=' .repeat(60));

    // Step 1: Generate weekly timesheets
    console.log('\n📋 STEP 1: Generating Weekly Timesheets');
    console.log('-'.repeat(40));
    await generateWeeklyTimesheets(weekStartDate);

    console.log('\n⏳ Waiting 2 seconds before updating...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Update timesheets with attendance and leave data
    console.log('\n📊 STEP 2: Updating Timesheets with Attendance & Leave Data');
    console.log('-'.repeat(40));
    await updateTimesheetsWithAttendance(weekStartDate);

    console.log('\n🎉 WEEKLY TIMESHEET AUTOMATION COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log('✅ All timesheets have been generated and updated');
    console.log('✅ Leave requests have been applied');
    console.log('✅ Ready for daily attendance updates');

  } catch (error) {
    console.error('\n❌ AUTOMATION FAILED:', error);
    process.exit(1);
  }
}

// Helper function to get current week Monday
function getCurrentWeekMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Helper function to format date for display
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Run automation
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📋 Weekly Timesheet Automation Script

Usage:
  node weekly-timesheet-automation.js [options] [date]

Options:
  --current-week, -c    Generate for current week (default)
  --this-week          Generate for this week (24 Nov - 29 Nov 2025)
  --help, -h           Show this help message

Examples:
  node weekly-timesheet-automation.js
  node weekly-timesheet-automation.js --this-week
  node weekly-timesheet-automation.js 2025-11-24
  node weekly-timesheet-automation.js --current-week

Date format: YYYY-MM-DD (Monday of the week)
    `);
    process.exit(0);
  }

  let weekStartDate = null;

  if (args.includes('--this-week')) {
    // This week: 24 Nov - 29 Nov 2025
    weekStartDate = '2025-11-24';
    console.log(`🎯 Running for THIS WEEK: ${weekStartDate}`);
  } else if (args.includes('--current-week') || args.includes('-c')) {
    // Current week
    weekStartDate = formatDate(getCurrentWeekMonday());
    console.log(`🎯 Running for CURRENT WEEK: ${weekStartDate}`);
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    // Custom date provided
    weekStartDate = args[0];
    console.log(`🎯 Running for CUSTOM WEEK: ${weekStartDate}`);
  } else {
    // Default to current week
    weekStartDate = formatDate(getCurrentWeekMonday());
    console.log(`🎯 Running for CURRENT WEEK (default): ${weekStartDate}`);
  }

  runWeeklyTimesheetAutomation(weekStartDate);
}

module.exports = { runWeeklyTimesheetAutomation };
