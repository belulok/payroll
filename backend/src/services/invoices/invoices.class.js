const { Service } = require('feathers-mongoose');
const Timesheet = require('../../models/timesheet.model');
const Worker = require('../../models/worker.model');

// NOTE: Client and Project models are registered via their Feathers services
// (clients and projects). Their model files export factory functions that
// expect the app instance, so we must resolve the actual Mongoose models from
// the services instead of calling the factories directly.

class InvoicesService extends Service {
	constructor(options, app) {
			super(options);
			this.app = app;

			// Underlying Mongoose models used by the `clients` and `projects` services.
			// This gives us proper access to `.findById(...)` and other model methods.
			this.ClientModel = app.service('clients').Model;
			this.ProjectModel = app.service('projects').Model;
		}

  async find(params) {
    const { query = {} } = params;

	    // Multi-tenant: subcon-admin is always scoped to their company.
	    // Agents/admins can pass an explicit companyId in the query (from the
	    // selected company in the UI). We keep that behaviour intact.
	    if (params.user && params.user.role === 'subcon-admin' && params.user.company) {
	      query.companyId = params.user.company;
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
	    // Set company from user for subcon-admin. For admin/agent we expect the
	    // frontend to send an explicit companyId (selected company in header).
	    if (params.user && params.user.role === 'subcon-admin' && params.user.company) {
	      data.companyId = params.user.company;
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

	  // Custom method to generate invoice from weekly timesheets
	  async generateInvoice(data, params) {
	    const { clientId, projectId, startDate, endDate, periodType, taxRate = 0 } = data;

	    if (!clientId || !projectId || !startDate || !endDate) {
	      throw new Error('Client, Project, Start Date, and End Date are required');
	    }

	    const user = params.user;
	    if (!user) {
	      throw new Error('Authentication required');
	    }

	    // Get client and project details from their services
	    const client = await this.ClientModel.findById(clientId);
	    const project = await this.ProjectModel.findById(projectId);

	    if (!client || !project) {
	      throw new Error('Client or Project not found');
	    }

	    // Ensure the selected project belongs to the selected client (when linked)
	    if (project.client && project.client.toString() !== client._id.toString()) {
	      throw new Error('Selected project does not belong to the selected client');
	    }

	    // Determine company for the invoice. Prefer the project's company, then
	    // client's company, then the subcon-admin's company.
	    let companyId = project.company || client.company || user.company;
	    if (!companyId) {
	      throw new Error('Unable to determine company for invoice');
	    }

	    // Find workers assigned to this project within the company. Workers store
	    // the project as a string (ObjectId) in the `project` field.
	    const workers = await Worker.find({
	      company: companyId,
	      project: project._id.toString(),
	      isActive: true,
	      employmentStatus: 'active'
	    }).select('firstName lastName employeeId department payrollInfo');

	    if (!workers.length) {
	      throw new Error('No workers found for the selected project');
	    }

	    const workerIdMap = new Map();
	    const workerIds = workers.map((w) => {
	      workerIdMap.set(w._id.toString(), w);
	      return w._id;
	    });

	    // Find weekly timesheets for those workers in the selected period
	    const start = new Date(startDate);
	    const end = new Date(endDate);

	    const timesheets = await Timesheet.find({
	      company: companyId,
	      worker: { $in: workerIds },
	      weekStartDate: { $gte: start, $lte: end },
	      status: { $in: ['approved', 'approved_admin'] },
	      isDeleted: false
	    }).populate('worker');

	    if (!timesheets.length) {
	      throw new Error('No approved timesheets found for the specified period');
	    }

	    // Group by worker and accumulate hours
	    const workerData = {};

	    for (const ts of timesheets) {
	      const workerId = ts.worker._id.toString();
	      const workerDoc = workerIdMap.get(workerId) || ts.worker;

	      if (!workerData[workerId]) {
	        const fullName = workerDoc.fullName || `${workerDoc.firstName || ''} ${workerDoc.lastName || ''}`.trim();
	        const hourlyRate = (workerDoc.payrollInfo && workerDoc.payrollInfo.hourlyRate) || 0;

	        workerData[workerId] = {
	          workerId: workerDoc._id,
	          workerName: fullName || workerDoc.employeeId || 'Worker',
	          team: workerDoc.department || '',
	          normalHours: 0,
	          otHours: 0,
	          sundayHours: 0,
	          phHours: 0,
	          normalRate: hourlyRate,
	          // For now, use the same base rate for OT/Sunday/PH; this can be
	          // refined later using company overtime settings if needed.
	          otRate: hourlyRate,
	          sundayRate: hourlyRate,
	          phRate: hourlyRate,
	          claimAmount: 0,
	          dailyBreakdown: []
	        };
	      }

	      const agg = workerData[workerId];

	      (ts.dailyEntries || []).forEach((entry) => {
	        const normal = entry.normalHours || 0;
	        const ot = (entry.ot1_5Hours || 0) + (entry.ot2_0Hours || 0);

	        agg.normalHours += normal;
	        agg.otHours += ot;

	        agg.dailyBreakdown.push({
	          date: entry.date,
	          normalHours: normal,
	          otHours: ot,
	          sundayHours: 0,
	          phHours: 0
	        });
	      });
	    }

	    // Calculate monetary amounts for each worker
	    const invoiceItems = Object.values(workerData).map((item) => {
	      const worker = item;
	      worker.totalHours = worker.normalHours + worker.otHours + worker.sundayHours + worker.phHours;
	      worker.normalAmount = worker.normalHours * worker.normalRate;
	      worker.otAmount = worker.otHours * worker.otRate;
	      worker.sundayAmount = worker.sundayHours * worker.sundayRate;
	      worker.phAmount = worker.phHours * worker.phRate;
	      worker.totalAmount = worker.normalAmount + worker.otAmount + worker.sundayAmount + worker.phAmount;
	      worker.grandTotal = worker.totalAmount + worker.claimAmount;
	      return worker;
	    });

		    // Calculate overall invoice totals
		    const totalNormalHours = invoiceItems.reduce((sum, item) => sum + item.normalHours, 0);
		    const totalOtHours = invoiceItems.reduce((sum, item) => sum + item.otHours, 0);
		    const totalSundayHours = invoiceItems.reduce((sum, item) => sum + item.sundayHours, 0);
		    const totalPhHours = invoiceItems.reduce((sum, item) => sum + item.phHours, 0);
		    const totalHours = totalNormalHours + totalOtHours + totalSundayHours + totalPhHours;

		    const subtotalAmount = invoiceItems.reduce((sum, item) => sum + item.totalAmount, 0);
		    const totalClaimAmount = invoiceItems.reduce((sum, item) => sum + item.claimAmount, 0);
		    const taxAmount = subtotalAmount * (taxRate / 100);
		    const grandTotal = subtotalAmount + taxAmount + totalClaimAmount;

		    const invoiceData = {
	      clientId,
	      clientName: client.name,
	      projectId,
	      projectName: project.name,
	      companyId,
	      periodType,
	      startDate: start,
	      endDate: end,
		      taxRate,
		      // Summary totals
		      totalNormalHours,
		      totalOtHours,
		      totalSundayHours,
		      totalPhHours,
		      totalHours,
		      subtotalAmount,
		      totalClaimAmount,
		      taxAmount,
		      grandTotal,
		      // Worker-level details
		      items: invoiceItems
	    };

		    // Use the standard create flow (which also handles dueDate and population)
		    const invoice = await this.create(invoiceData, params);
		    return invoice;
	  }
}

module.exports = InvoicesService;
