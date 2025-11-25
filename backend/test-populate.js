const app = require('./src/app');

async function testPopulate() {
  try {
    console.log('Testing populate...\n');

    // Test timesheets
    console.log('=== Testing Timesheets ===');
    const timesheets = await app.service('timesheets').find({
      query: {
        $limit: 2
      }
    });
    
    const timesheetData = timesheets.data || timesheets;
    console.log('Timesheets count:', timesheetData.length);
    if (timesheetData.length > 0) {
      console.log('First timesheet worker:', JSON.stringify(timesheetData[0].worker, null, 2));
    }

    // Test payroll-records
    console.log('\n=== Testing Payroll Records ===');
    const payrolls = await app.service('payroll-records').find({
      query: {
        $limit: 2
      }
    });
    
    const payrollData = payrolls.data || payrolls;
    console.log('Payroll records count:', payrollData.length);
    if (payrollData.length > 0) {
      console.log('First payroll worker:', JSON.stringify(payrollData[0].worker, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPopulate();

