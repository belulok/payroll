const { Service } = require('feathers-mongoose');

exports.GazettedHolidays = class GazettedHolidays extends Service {
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

    // Extract year from date
    if (data.date && !data.year) {
      data.year = new Date(data.date).getFullYear();
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
};

