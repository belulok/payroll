const { Service } = require('feathers-mongoose');

exports.Payroll = class Payroll extends Service {
  constructor(options, app) {
    super(options);
    this.app = app;
  }

  // Override create to use the payroll-records generatePayroll method
  async create(data, params) {
    const { workerId, periodStart, periodEnd } = data;

    if (!workerId || !periodStart || !periodEnd) {
      throw new Error('workerId, periodStart, and periodEnd are required');
    }

    // Use the payroll-records service's generatePayroll method
    const payrollRecordsService = this.app.service('payroll-records');

    return payrollRecordsService.generatePayroll(workerId, periodStart, periodEnd, params);
  }
};

