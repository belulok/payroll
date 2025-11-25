const { Service } = require('feathers-mongoose');

exports.LeaveBalances = class LeaveBalances extends Service {
  constructor(options, app) {
    super(options);
    this.app = app;
  }

  async create(data, params) {
    // Ensure company is set from authenticated user if not provided
    if (!data.company && params.user) {
      if (params.user.role === 'subcon-admin') {
        data.company = params.user.company;
      }
    }

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

  // Custom method to initialize leave balances for a worker
  async initializeWorkerLeaveBalances(workerId, year) {
    const Worker = this.app.service('workers').Model;
    const LeaveType = this.app.service('leave-types').Model;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    // Get all active leave types for the company
    const leaveTypes = await LeaveType.find({
      company: worker.company,
      isActive: true
    });

    const balances = [];

    for (const leaveType of leaveTypes) {
      // Check if balance already exists
      const existing = await this.Model.findOne({
        company: worker.company,
        worker: workerId,
        leaveType: leaveType._id,
        year: year
      });

      if (!existing) {
        // Get days allowed based on worker's tier
        const totalDays = leaveType.getDaysAllowedForTier(worker.leaveTier);

        const balance = await this.Model.create({
          company: worker.company,
          worker: workerId,
          leaveType: leaveType._id,
          year: year,
          totalDays: totalDays,
          usedDays: 0,
          pendingDays: 0,
          carriedForwardDays: 0
        });

        balances.push(balance);
      }
    }

    return balances;
  }
};

