require('dotenv').config();
const mongoose = require('mongoose');
const Timesheet = require('./src/models/timesheet.model');
const Worker = require('./src/models/worker.model');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll-system')
  .then(async () => {
    console.log('Connected to MongoDB');

    const timesheets = await Timesheet.find().populate('worker').sort({ weekStartDate: -1 }).limit(10);
    console.log(`\nFound ${timesheets.length} timesheets:`);

    if (timesheets.length === 0) {
      console.log('\nNo timesheets found in database!');
    } else {
      timesheets.forEach((ts, index) => {
        console.log(`\n${index + 1}. Worker: ${ts.worker?.firstName} ${ts.worker?.lastName}`);
        console.log(`   Week: ${ts.weekStartDate?.toDateString()} - ${ts.weekEndDate?.toDateString()}`);
        console.log(`   Total Hours: ${ts.totalHours}h (${ts.totalNormalHours}h + ${ts.totalOT1_5Hours}h OT1.5x + ${ts.totalOT2_0Hours}h OT2x)`);
        console.log(`   Status: ${ts.status}`);
        console.log(`   Days: ${ts.dailyEntries?.length || 0}`);
      });
    }

    // Check current week
    const today = new Date();
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);

    console.log(`\n\n📅 Current week: ${monday.toDateString()} - ${friday.toDateString()}`);

    const currentWeekTimesheets = await Timesheet.find({
      weekStartDate: { $gte: monday, $lte: friday }
    }).populate('worker');

    console.log(`Found ${currentWeekTimesheets.length} timesheets for current week`);

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

