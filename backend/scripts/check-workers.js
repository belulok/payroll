require('dotenv').config();
const mongoose = require('mongoose');

const Worker = require('../src/models/worker.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll';

async function checkWorkers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const allWorkers = await Worker.find({}).select('employeeId firstName lastName');
    console.log(`\nTotal workers in database: ${allWorkers.length}`);
    console.log('\nAll workers:');
    allWorkers.forEach(w => {
      console.log(`  ${w.employeeId}: ${w.firstName} ${w.lastName}`);
    });

    const targetIds = ['MS002', 'UB001', 'UB002', 'W001', 'W002', 'W003', 'W3242423'];
    console.log('\n\nLooking for specific workers:');
    for (const id of targetIds) {
      const worker = await Worker.findOne({ employeeId: id });
      if (worker) {
        console.log(`  ✓ ${id}: ${worker.firstName} ${worker.lastName}`);
      } else {
        console.log(`  ✗ ${id}: NOT FOUND`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

checkWorkers();

