const { Service } = require('feathers-mongoose');

class Companies extends Service {
  constructor(options, app) {
    super(options, app);
    this.app = app;
  }

  // Override find to filter by company for subcon-admin and agent
  async find(params) {
    if (params.user) {
      params.query = params.query || {};

      // Subcon-admin can only see their own company
      if (params.user.role === 'subcon-admin') {
        params.query._id = params.user.company;
      }

      // Agent can see companies assigned to them
      if (params.user.role === 'agent') {
        params.query.agent = params.user._id;
      }
    }
    return super.find(params);
  }

  // Override get to check company access
  async get(id, params) {
    const company = await super.get(id, params);

    if (params.user && params.user.role === 'subcon-admin') {
      if (company._id.toString() !== params.user.company.toString()) {
        throw new Error('Unauthorized access to company');
      }
    }

    return company;
  }

  // Override create to apply subscription plan limits
  async create(data, params) {
    // Apply plan limits
    const planLimits = {
      trial: { maxWorkers: 5, monthlyFee: 0 },
      basic: { maxWorkers: 20, monthlyFee: 99 },
      standard: { maxWorkers: 50, monthlyFee: 249 },
      premium: { maxWorkers: 200, monthlyFee: 499 }
    };

    if (data.subscription && data.subscription.plan) {
      const plan = planLimits[data.subscription.plan];
      if (plan) {
        data.subscription.maxWorkers = plan.maxWorkers;
        data.subscription.monthlyFee = plan.monthlyFee;
      }
    }

    return super.create(data, params);
  }

  // Override patch to check permissions
  async patch(id, data, params) {
    // Subcon admins can only update their own company
    if (params.user && params.user.role === 'subcon-admin') {
      if (id.toString() !== params.user.company.toString()) {
        throw new Error('Unauthorized access to company');
      }
      // Prevent changing subscription plan
      delete data.subscription;
    }

    // If plan is being changed, update limits
    if (data.subscription && data.subscription.plan) {
      const planLimits = {
        trial: { maxWorkers: 5, monthlyFee: 0 },
        basic: { maxWorkers: 20, monthlyFee: 99 },
        standard: { maxWorkers: 50, monthlyFee: 249 },
        premium: { maxWorkers: 200, monthlyFee: 499 }
      };

      const plan = planLimits[data.subscription.plan];
      if (plan) {
        data.subscription.maxWorkers = plan.maxWorkers;
        data.subscription.monthlyFee = plan.monthlyFee;
      }
    }

    return super.patch(id, data, params);
  }

  // Override remove to prevent deletion by subcon-admin
  async remove(id, params) {
    if (params.user && params.user.role === 'subcon-admin') {
      throw new Error('Subcon admins cannot delete companies');
    }

    return super.remove(id, params);
  }
}

exports.Companies = Companies;

