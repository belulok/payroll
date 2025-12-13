const { Service } = require('feathers-mongoose');

const getCompanyId = (company) => {
  if (!company) return null;
  if (typeof company === 'string') return company;
  if (typeof company === 'object' && company._id) return company._id.toString();
  if (typeof company.toString === 'function') return company.toString();
  return null;
};

class WorkerDocuments extends Service {
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
    const document = await super.get(id, params);

    if (params.user && params.user.role === 'subcon-admin') {
      const docCompanyId = getCompanyId(document.company);
      const userCompanyId = getCompanyId(params.user.company);

      if (docCompanyId && userCompanyId && docCompanyId !== userCompanyId) {
        throw new Error('Unauthorized access to document');
      }
    }

    return document;
  }

  // Override create to auto-assign company
  async create(data, params) {
    // Auto-assign company for subcon-admin
    if (params.user && params.user.role === 'subcon-admin') {
      data.company = params.user.company;
    }

    // Set createdBy
    if (params.user) {
      data.createdBy = params.user._id;
    }

    return super.create(data, params);
  }

  // Override patch
  async patch(id, data, params) {
    const existing = await this.get(id, params);

    // Check company access
    if (params.user && params.user.role === 'subcon-admin') {
      const existingCompanyId = getCompanyId(existing.company);
      const userCompanyId = getCompanyId(params.user.company);

      if (existingCompanyId && userCompanyId && existingCompanyId !== userCompanyId) {
        throw new Error('Unauthorized access to document');
      }
    }

    // Set updatedBy
    if (params.user) {
      data.updatedBy = params.user._id;
    }

    return super.patch(id, data, params);
  }

  // Get documents by worker
  async findByWorker(workerId, params) {
    params.query = params.query || {};
    params.query.worker = workerId;
    return this.find(params);
  }

  // Get expiring documents
  async findExpiring(daysFromNow, companyId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysFromNow);
    targetDate.setHours(23, 59, 59, 999);

    const query = {
      expiryDate: { $gte: today, $lte: targetDate },
      status: { $ne: 'archived' },
      reminderEnabled: true
    };

    if (companyId) {
      query.company = companyId;
    }

    return this.find({
      query,
      paginate: false
    });
  }
}

exports.WorkerDocuments = WorkerDocuments;



