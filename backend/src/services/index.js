const users = require('./users/users.service.js');
const payroll = require('./payroll/payroll.service.js');
const companies = require('./companies/companies.service.js');
const workers = require('./workers/workers.service.js');
const timesheets = require('./timesheets/timesheets.service.js');
const payrollRecords = require('./payroll-records/payroll-records.service.js');
const leaveTypes = require('./leave-types/leave-types.service.js');
const leaveBalances = require('./leave-balances/leave-balances.service.js');
const leaveRequests = require('./leave-requests/leave-requests.service.js');
const gazettedHolidays = require('./gazetted-holidays/gazetted-holidays.service.js');
const unitRecords = require('./unit-records/unit-records.service.js');

module.exports = function (app) {
  app.configure(users);
  app.configure(companies);
  app.configure(workers);
  app.configure(timesheets);
  app.configure(payrollRecords);
  app.configure(leaveTypes);
  app.configure(leaveBalances);
  app.configure(leaveRequests);
  app.configure(gazettedHolidays);
  app.configure(unitRecords);
  app.configure(payroll);
};

