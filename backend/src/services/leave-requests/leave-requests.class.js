const { Service } = require('feathers-mongoose');

exports.LeaveRequests = class LeaveRequests extends Service {
  constructor(options, app) {
    super(options);
    this.app = app;
  }

  async create(data, params) {
    // Ensure company and createdBy are set
    if (!data.company && params.user) {
      if (params.user.role === 'subcon-admin' || params.user.role === 'worker') {
        data.company = params.user.company;
      }
    }
    data.createdBy = params.user._id;

    // Check for overlapping leave requests (pending or approved)
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    const overlapping = await this.Model.findOne({
      worker: data.worker,
      status: { $in: ['pending', 'approved'] },
      $or: [
        // New leave starts during existing leave
        { startDate: { $lte: startDate }, endDate: { $gte: startDate } },
        // New leave ends during existing leave
        { startDate: { $lte: endDate }, endDate: { $gte: endDate } },
        // New leave completely contains existing leave
        { startDate: { $gte: startDate }, endDate: { $lte: endDate } }
      ]
    });

    if (overlapping) {
      const overlapStart = new Date(overlapping.startDate).toLocaleDateString();
      const overlapEnd = new Date(overlapping.endDate).toLocaleDateString();
      throw new Error(`Leave already exists for overlapping dates (${overlapStart} - ${overlapEnd}). Please cancel the existing leave first.`);
    }

    // Only check leave balance if leaveType ObjectId is provided
    // Virtual leave types (from compensation config) don't have balance records in the database
    if (data.leaveType) {
      // Check leave balance from database
      const LeaveBalance = this.app.service('leave-balances').Model;
      const balance = await LeaveBalance.findOne({
        company: data.company,
        worker: data.worker,
        leaveType: data.leaveType,
        year: new Date(data.startDate).getFullYear()
      });

      if (balance) {
        if (!balance.canTakeLeave(data.totalDays)) {
          throw new Error(`Insufficient leave balance. Available: ${balance.remainingDays} days`);
        }

        // Reserve the days
        await balance.reserveDays(data.totalDays);
        data.leaveBalance = balance._id;
      }
      // If no balance record exists but leaveType is provided, allow the request
      // The admin can manage it manually
    }
    // For virtual leave types (no leaveType ObjectId), skip balance check
    // Balance is managed through compensation config entitlements
    // Admin will approve/reject based on policy

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

  // Approve leave request and update timesheet
  async approve(id, params) {
    const leaveRequest = await this.Model.findById(id);
    if (!leaveRequest) {
      throw new Error('Leave request not found');
    }

    if (leaveRequest.status !== 'pending') {
      throw new Error('Can only approve pending leave requests');
    }

    // Use the model's approve method (updates balance)
    await leaveRequest.approve(params.user._id);

    // Update timesheet entries for the leave dates
    await this.updateTimesheetForLeave(leaveRequest, 'add');

    return leaveRequest;
  }

  // Cancel leave request and restore quota
  async cancel(id, params) {
    const leaveRequest = await this.Model.findById(id);
    if (!leaveRequest) {
      throw new Error('Leave request not found');
    }

    // Can cancel pending OR approved leave
    if (leaveRequest.status !== 'pending' && leaveRequest.status !== 'approved') {
      throw new Error('Can only cancel pending or approved leave requests');
    }

    const wasApproved = leaveRequest.status === 'approved';

    // Use the model's cancel method (updates balance)
    await leaveRequest.cancel(params.user._id);

    // If it was approved, clear the leave from timesheet
    if (wasApproved) {
      await this.updateTimesheetForLeave(leaveRequest, 'remove');
    }

    return leaveRequest;
  }

  // Helper to update timesheet entries for leave
  async updateTimesheetForLeave(leaveRequest, action) {
    const Timesheet = this.app.service('timesheets').Model;
    const startDate = new Date(leaveRequest.startDate);
    const endDate = new Date(leaveRequest.endDate);

    // Get leave type code for timesheet entry
    let leaveTypeCode = leaveRequest.leaveTypeCode || 'UL'; // Default to Unpaid Leave
    if (leaveRequest.leaveTypeName) {
      if (leaveRequest.leaveTypeName.toLowerCase().includes('annual')) leaveTypeCode = 'AL';
      else if (leaveRequest.leaveTypeName.toLowerCase().includes('sick') || leaveRequest.leaveTypeName.toLowerCase().includes('medical')) leaveTypeCode = 'MC';
      else if (leaveRequest.leaveTypeName.toLowerCase().includes('unpaid')) leaveTypeCode = 'UL';
    }

    // Find timesheets that cover the leave period
    const timesheets = await Timesheet.find({
      worker: leaveRequest.worker,
      company: leaveRequest.company,
      weekStartDate: { $lte: endDate },
      weekEndDate: { $gte: startDate }
    });

    for (const timesheet of timesheets) {
      let modified = false;

      for (const entry of timesheet.dailyEntries) {
        const entryDate = new Date(entry.date);

        // Check if this entry falls within the leave period
        if (entryDate >= startDate && entryDate <= endDate) {
          if (action === 'add') {
            // Mark as leave
            entry.isAbsent = true;
            entry.leaveType = leaveTypeCode;
            entry.notes = `${leaveRequest.leaveTypeName || 'Leave'} - Approved`;
            // Clear work hours
            entry.clockIn = null;
            entry.clockOut = null;
            entry.lunchOut = null;
            entry.lunchIn = null;
            entry.normalHours = 0;
            entry.ot1_5Hours = 0;
            entry.ot2_0Hours = 0;
            entry.totalHours = 0;
          } else if (action === 'remove') {
            // Clear leave marking
            entry.isAbsent = false;
            entry.leaveType = null;
            entry.notes = null;
          }
          modified = true;
        }
      }

      if (modified) {
        // Recalculate totals
        timesheet.totalNormalHours = timesheet.dailyEntries.reduce((sum, e) => sum + (e.normalHours || 0), 0);
        timesheet.totalOT1_5Hours = timesheet.dailyEntries.reduce((sum, e) => sum + (e.ot1_5Hours || 0), 0);
        timesheet.totalOT2_0Hours = timesheet.dailyEntries.reduce((sum, e) => sum + (e.ot2_0Hours || 0), 0);
        timesheet.totalHours = timesheet.totalNormalHours + timesheet.totalOT1_5Hours + timesheet.totalOT2_0Hours;
        await timesheet.save();
      }
    }
  }
};

