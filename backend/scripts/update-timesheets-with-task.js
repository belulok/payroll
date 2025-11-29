require('dotenv').config();
const mongoose = require('mongoose');
const Timesheet = require('../src/models/timesheet.model.js');
const Task = require('../src/models/task.model.js');

async function updateTimesheetsWithTask() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the Manual Labour task
    console.log('\n🔍 Finding Manual Labour task...');
    const manualLabourTask = await Task.findOne({ taskId: 'ManLab' });
    
    if (!manualLabourTask) {
      console.error('❌ Manual Labour task not found! Please create it first.');
      process.exit(1);
    }
    
    console.log(`✅ Found Manual Labour task: ${manualLabourTask.name} (${manualLabourTask.taskId})`);

    // Find all timesheets that don't have a task assigned
    console.log('\n🔍 Finding timesheets without task assignment...');
    const timesheetsWithoutTask = await Timesheet.find({ 
      task: { $exists: false } 
    });
    
    console.log(`📊 Found ${timesheetsWithoutTask.length} timesheets without task assignment`);

    if (timesheetsWithoutTask.length === 0) {
      console.log('✅ All timesheets already have task assignments!');
      await mongoose.connection.close();
      return;
    }

    // Update all timesheets to include the Manual Labour task
    console.log('\n🔄 Updating timesheets with Manual Labour task...');
    const updateResult = await Timesheet.updateMany(
      { task: { $exists: false } },
      { $set: { task: manualLabourTask._id } }
    );

    console.log(`✅ Successfully updated ${updateResult.modifiedCount} timesheets`);

    // Verify the update
    console.log('\n🔍 Verifying update...');
    const updatedTimesheets = await Timesheet.find({ task: manualLabourTask._id }).populate('task');
    console.log(`✅ Verification: ${updatedTimesheets.length} timesheets now have Manual Labour task`);

    // Display summary
    console.log('\n📊 Update Summary:');
    console.log(`- Timesheets found without task: ${timesheetsWithoutTask.length}`);
    console.log(`- Timesheets updated: ${updateResult.modifiedCount}`);
    console.log(`- Task assigned: ${manualLabourTask.name} (${manualLabourTask.taskId})`);

    console.log('\n✅ Task assignment completed successfully!');

  } catch (error) {
    console.error('❌ Error updating timesheets:', error);
    process.exit(1);
  } finally {
    console.log('\n🔌 Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Run the update
updateTimesheetsWithTask();
