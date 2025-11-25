const { Service } = require('feathers-mongoose');

exports.LeaveRequests = class LeaveRequests extends Service {
  constructor(options, app) {
    super(options);
    this.app = app;
  }

  async create(data, params) {
    // Ensure company and createdBy are set
    if (!data.company && params.user) {
      if (params.user.role === 'subcon-admin') {
        data.company = params.user.company;
      }
    }
    data.createdBy = params.user._id;

    // Check leave balance
    const LeaveBalance = this.app.service('leave-balances').Model;
    const balance = await LeaveBalance.findOne({
      company: data.company,
      worker: data.worker,
      leaveType: data.leaveType,
      year: new Date(data.startDate).getFullYear()
    });

    if (!balance) {
      throw new Error('Leave balance not found for this worker and leave type');
    }

    if (!balance.canTakeLeave(data.totalDays)) {
      throw new Error(`Insufficient leave balance. Available: ${balance.remainingDays} days`);
    }

    // Reserve the days
    await balance.reserveDays(data.totalDays);
    data.leaveBalance = balance._id;

    return super.create(data, params);
  }

  async find(params) {
    // Multi-tenant isolation
    if (params.user && params.user.role === 'subcon-admin') {
      params.query = {
        ...params.query,
        company: params.user.company
      };
    }

    return super.find(params);
  }
};

