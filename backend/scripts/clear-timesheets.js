require('dotenv').config();
const mongoose = require('mongoose');

const Timesheet = require('../src/models/timesheet.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll';

async function clearTimesheets() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await Timesheet.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} timesheets`);

  } catch (error) {
    console.error('Error clearing timesheets:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

clearTimesheets();

