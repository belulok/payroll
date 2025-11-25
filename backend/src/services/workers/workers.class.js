const { Service } = require('feathers-mongoose');
const Worker = require('../../models/worker.model');
const Company = require('../../models/company.model');

class Workers extends Service {
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
    const worker = await super.get(id, params);

    if (params.user && params.user.role === 'subcon-admin') {
      if (worker.company.toString() !== params.user.company.toString()) {
        throw new Error('Unauthorized access to worker');
      }
    }

    return worker;
  }

  // Override create with worker limit validation
  async create(data, params) {
    // Auto-assign company for subcon-admin
    if (params.user && params.user.role === 'subcon-admin') {
      data.company = params.user.company;
    }

    // Validate company exists
    const company = await Company.findById(data.company);
    if (!company) {
      throw new Error('Company not found');
    }

    // Check worker limit
    const workerCount = await Worker.countDocuments({
      company: data.company,
      isActive: true
    });

    if (!company.canAddWorker(workerCount)) {
      throw new Error(
        `Worker limit reached. Current plan allows ${company.subscription.maxWorkers} workers.`
      );
    }

    return super.create(data, params);
  }

  // Override patch to check permissions
  async patch(id, data, params) {
    const existing = await this.get(id, params);

    // Check company access for subcon-admin
    if (params.user && params.user.role === 'subcon-admin') {
      if (existing.company.toString() !== params.user.company.toString()) {
        throw new Error('Unauthorized access to worker');
      }
    }

    return super.patch(id, data, params);
  }

  // Override remove to soft delete
  async remove(id, params) {
    return this.patch(id, { isActive: false }, params);
  }

  // Custom method: Bulk import workers
  async bulkImport(workers, params) {
    const company = params.user.role === 'subcon-admin' 
      ? params.user.company 
      : workers[0]?.company;

    if (!company) {
      throw new Error('Company is required for bulk import');
    }

    // Get company and check limits
    const companyDoc = await Company.findById(company);
    if (!companyDoc) {
      throw new Error('Company not found');
    }

    const currentCount = await Worker.countDocuments({
      company: company,
      isActive: true
    });

    const newCount = currentCount + workers.length;
    if (newCount > companyDoc.subscription.maxWorkers) {
      throw new Error(
        `Cannot import ${workers.length} workers. ` +
        `Current: ${currentCount}, Limit: ${companyDoc.subscription.maxWorkers}`
      );
    }

    // Import workers
    const results = [];
    for (const workerData of workers) {
      workerData.company = company;
      const worker = await this.create(workerData, params);
      results.push(worker);
    }

    return results;
  }
}

exports.Workers = Workers;

