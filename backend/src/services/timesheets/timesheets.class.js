const { Service } = require('feathers-mongoose');
const Timesheet = require('../../models/timesheet.model');
const Worker = require('../../models/worker.model');

class Timesheets extends Service {
  constructor(options, app) {
    super(options, app);
    this.app = app;
  }

  // Override find to filter by company for subcon-admin
  async find(params) {
    if (params.user && params.user.role === 'subcon-admin') {
      params.query = params.query || {};
      params.query.company = params.user.company;
    }
    return super.find(params);
  }

  // Override get to check company access
  async get(id, params) {
    const timesheet = await super.get(id, params);

    if (params.user && params.user.role === 'subcon-admin') {
      if (timesheet.company.toString() !== params.user.company.toString()) {
        throw new Error('Unauthorized access to timesheet');
      }
    }

    return timesheet;
  }

  // Override create with conflict detection
  async create(data, params) {
    // Auto-assign company for subcon-admin
    if (params.user && params.user.role === 'subcon-admin') {
      data.company = params.user.company;
    }

    // Verify worker belongs to company
    const worker = await Worker.findById(data.worker);
    if (!worker || worker.company.toString() !== data.company.toString()) {
      throw new Error('Worker does not belong to this company');
    }

    // Set created by
    data.createdBy = params.user._id;

    // Calculate total hours if not provided
    if (!data.totalHours) {
      data.totalHours = (data.normalHours || 0) + (data.ot1_5Hours || 0) + (data.ot2_0Hours || 0);
    }

    // Check for conflicts
    const conflicts = await Timesheet.findConflicts(
      data.worker,
      new Date(data.date),
      new Date(data.clockIn),
      new Date(data.clockOut)
    );

    if (conflicts.length > 0) {
      data.isConflict = true;
      data.conflictWith = conflicts.map(c => c._id);
    }

    return super.create(data, params);
  }

  // Override patch to check permissions and update conflicts
  async patch(id, data, params) {
    const existing = await this.get(id, params);

    // Check company access for subcon-admin
    if (params.user && params.user.role === 'subcon-admin') {
      if (existing.company.toString() !== params.user.company.toString()) {
        throw new Error('Unauthorized access to timesheet');
      }
    }

    // Set last modified by
    data.lastModifiedBy = params.user._id;

    // Recalculate total hours if hours changed
    if (data.normalHours !== undefined || data.ot1_5Hours !== undefined || data.ot2_0Hours !== undefined) {
      data.totalHours = (data.normalHours || existing.normalHours || 0) +
                        (data.ot1_5Hours || existing.ot1_5Hours || 0) +
                        (data.ot2_0Hours || existing.ot2_0Hours || 0);
    }

    // Recheck conflicts if time changed
    if (data.clockIn || data.clockOut || data.date) {
      const conflicts = await Timesheet.findConflicts(
        existing.worker,
        new Date(data.date || existing.date),
        new Date(data.clockIn || existing.clockIn),
        new Date(data.clockOut || existing.clockOut),
        id
      );

      data.isConflict = conflicts.length > 0;
      data.conflictWith = conflicts.map(c => c._id);
    }

    return super.patch(id, data, params);
  }

  // Override remove to soft delete
  async remove(id, params) {
    return this.patch(id, { isDeleted: true }, params);
  }

  // Custom method: Approve timesheet
  async approve(id, params) {
    const timesheet = await this.get(id, params);
    const user = params.user;

    let newStatus;
    let approvalRole;

    if (user.role === 'subcon-admin') {
      if (timesheet.status !== 'submitted') {
        throw new Error('Timesheet must be submitted before approval');
      }
      newStatus = 'approved_subcon';
      approvalRole = 'subcon-admin';
    } else if (user.role === 'admin') {
      if (timesheet.status !== 'approved_subcon') {
        throw new Error('Timesheet must be approved by subcon admin first');
      }
      newStatus = 'approved_admin';
      approvalRole = 'admin';
    } else {
      throw new Error('Unauthorized to approve timesheets');
    }

    const approvalEntry = {
      approvedBy: user._id,
      role: approvalRole,
      status: 'approved',
      comments: params.data?.comments || '',
      timestamp: new Date()
    };

    return this.patch(id, {
      status: newStatus,
      $push: { approvalHistory: approvalEntry }
    }, params);
  }

  // Custom method: Reject timesheet
  async reject(id, params) {
    const timesheet = await this.get(id, params);
    const user = params.user;

    if (!['subcon-admin', 'admin'].includes(user.role)) {
      throw new Error('Unauthorized to reject timesheets');
    }

    const approvalEntry = {
      approvedBy: user._id,
      role: user.role,
      status: 'rejected',
      comments: params.data?.comments || '',
      timestamp: new Date()
    };

    return this.patch(id, {
      status: 'rejected',
      $push: { approvalHistory: approvalEntry }
    }, params);
  }
}

exports.Timesheets = Timesheets;

