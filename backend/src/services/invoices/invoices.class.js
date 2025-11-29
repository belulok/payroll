const { Service } = require('feathers-mongoose');
const Invoice = require('../../models/invoice.model');
const Timesheet = require('../../models/timesheet.model');
const Worker = require('../../models/worker.model');
const Client = require('../../models/client.model');
const Project = require('../../models/project.model');

class InvoicesService extends Service {
  constructor(options, app) {
    super(options, app);
  }

  async find(params) {
    const { query = {} } = params;
    
    // Add company filter for multi-tenant
    if (params.user && params.user.companyId) {
      query.companyId = params.user.companyId;
    }

    const result = await super.find({
      ...params,
      query: {
        ...query,
        $populate: [
          { path: 'clientId', select: 'name address email phone' },
          { path: 'projectId', select: 'name location' },
          { path: 'companyId', select: 'name' }
        ]
      }
    });

    return result;
  }

  async get(id, params) {
    const result = await super.get(id, {
      ...params,
      query: {
        ...params.query,
        $populate: [
          { path: 'clientId', select: 'name address email phone' },
          { path: 'projectId', select: 'name location' },
          { path: 'companyId', select: 'name address' },
          { path: 'items.workerId', select: 'name employeeId team' }
        ]
      }
    });

    return result;
  }

  async create(data, params) {
    // Set company from user
    if (params.user && params.user.companyId) {
      data.companyId = params.user.companyId;
    }

    // Set due date if not provided (default 30 days)
    if (!data.dueDate) {
      const dueDate = new Date(data.invoiceDate || Date.now());
      dueDate.setDate(dueDate.getDate() + 30);
      data.dueDate = dueDate;
    }

    const invoice = await super.create(data, params);
    return this.get(invoice._id, params);
  }

  // Custom method to generate invoice from timesheets
  async generateInvoice(data, params) {
    const { clientId, projectId, startDate, endDate, periodType, taxRate = 0 } = data;

    // Validate required fields
    if (!clientId || !projectId || !startDate || !endDate) {
      throw new Error('Client, Project, Start Date, and End Date are required');
    }

    // Get client and project details
    const client = await Client.findById(clientId);
    const project = await Project.findById(projectId);
    
    if (!client || !project) {
      throw new Error('Client or Project not found');
    }

    // Find timesheets for the period
    const timesheets = await Timesheet.find({
      clientId,
      projectId,
      weekStartDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      status: 'approved'
    }).populate('workerId', 'name employeeId team hourlyRate otRate sundayRate phRate');

    if (timesheets.length === 0) {
      throw new Error('No approved timesheets found for the specified period');
    }

    // Group timesheets by worker
    const workerData = {};
    
    timesheets.forEach(timesheet => {
      const workerId = timesheet.workerId._id.toString();
      
      if (!workerData[workerId]) {
        workerData[workerId] = {
          workerId: timesheet.workerId._id,
          workerName: timesheet.workerId.name,
          team: timesheet.workerId.team,
          normalHours: 0,
          otHours: 0,
          sundayHours: 0,
          phHours: 0,
          normalRate: timesheet.workerId.hourlyRate || 0,
          otRate: timesheet.workerId.otRate || 0,
          sundayRate: timesheet.workerId.sundayRate || 0,
          phRate: timesheet.workerId.phRate || 0,
          claimAmount: 0,
          dailyBreakdown: []
        };
      }

      const worker = workerData[workerId];

      // Sum up hours from timesheet days
      timesheet.days.forEach(day => {
        worker.normalHours += day.regularHours || 0;
        worker.otHours += day.overtimeHours || 0;
        worker.sundayHours += day.sundayHours || 0;
        worker.phHours += day.publicHolidayHours || 0;
        worker.claimAmount += day.claimAmount || 0;

        // Add to daily breakdown
        worker.dailyBreakdown.push({
          date: day.date,
          normalHours: day.regularHours || 0,
          otHours: day.overtimeHours || 0,
          sundayHours: day.sundayHours || 0,
          phHours: day.publicHolidayHours || 0
        });
      });
    });

    // Calculate amounts for each worker
    const invoiceItems = Object.values(workerData).map(worker => {
      worker.totalHours = worker.normalHours + worker.otHours + worker.sundayHours + worker.phHours;
      worker.normalAmount = worker.normalHours * worker.normalRate;
      worker.otAmount = worker.otHours * worker.otRate;
      worker.sundayAmount = worker.sundayHours * worker.sundayRate;
      worker.phAmount = worker.phHours * worker.phRate;
      worker.totalAmount = worker.normalAmount + worker.otAmount + worker.sundayAmount + worker.phAmount;
      worker.grandTotal = worker.totalAmount + worker.claimAmount;
      
      return worker;
    });

    // Create invoice
    const invoiceData = {
      clientId,
      clientName: client.name,
      projectId,
      projectName: project.name,
      companyId: params.user.companyId,
      periodType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      taxRate,
      items: invoiceItems
    };

    const invoice = await this.create(invoiceData, params);
    
    // Calculate and save totals
    invoice.calculateTotals();
    await invoice.save();

    return this.get(invoice._id, params);
  }
}

module.exports = InvoicesService;
