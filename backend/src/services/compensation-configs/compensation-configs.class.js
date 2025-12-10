const { Service } = require('feathers-mongoose');

exports.CompensationConfigs = class CompensationConfigs extends Service {
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

  async get(id, params) {
    const result = await super.get(id, params);
    
    // Check company access for subcon-admin
    if (params.user && params.user.role === 'subcon-admin') {
      const resultCompanyId = result.company.toString();
      const userCompanyId = params.user.company.toString();
      
      if (resultCompanyId !== userCompanyId) {
        throw new Error('Unauthorized access to compensation config');
      }
    }
    
    return result;
  }

  async patch(id, data, params) {
    const existing = await this.get(id, params);
    
    // Check company access for subcon-admin
    if (params.user && params.user.role === 'subcon-admin') {
      const existingCompanyId = existing.company.toString();
      const userCompanyId = params.user.company.toString();
      
      if (existingCompanyId !== userCompanyId) {
        throw new Error('Unauthorized access to compensation config');
      }
    }
    
    return super.patch(id, data, params);
  }

  async remove(id, params) {
    const existing = await this.get(id, params);
    
    // Check company access for subcon-admin
    if (params.user && params.user.role === 'subcon-admin') {
      const existingCompanyId = existing.company.toString();
      const userCompanyId = params.user.company.toString();
      
      if (existingCompanyId !== userCompanyId) {
        throw new Error('Unauthorized access to compensation config');
      }
    }
    
    return super.remove(id, params);
  }
};

