const { Service } = require('feathers-mongoose');

exports.Projects = class Projects extends Service {
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
	    const { user } = params;
	    const originalQuery = params.query || {};

	    if (user) {
	      if (user.role === 'subcon-admin') {
	        // Subcon-admin can only see their own company's projects
	        params.query = {
	          ...originalQuery,
	          company: user.company
	        };
	      } else if (user.role === 'agent') {
	        // Agent can see projects only from companies they manage.
	        const companies = await this.app.service('companies').find({
	          query: {
	            agent: user._id,
	            $limit: 1000,
	            $select: ['_id']
	          },
	          paginate: false
	        });

	        const allowedCompanyIds = companies.map(c => c._id.toString());
	        const requestedCompany = originalQuery.company;

	        if (requestedCompany) {
	          let requestedIds = [];
	          if (typeof requestedCompany === 'string') {
	            requestedIds = [requestedCompany];
	          } else if (requestedCompany.$in && Array.isArray(requestedCompany.$in)) {
	            requestedIds = requestedCompany.$in;
	          }

	          const allAllowed = requestedIds.every(id =>
	            allowedCompanyIds.includes(id.toString())
	          );

	          if (!allAllowed) {
	            throw new Error('Access denied');
	          }

	          // Preserve the explicit company filter coming from the UI so
	          // switching the selected company changes which projects are
	          // visible.
	          params.query = { ...originalQuery };
	        } else {
	          params.query = {
	            ...originalQuery,
	            company: { $in: allowedCompanyIds }
	          };
	        }
	      }
	      // Admin can see all projects (no additional filter)
	    }

	    return super.find(params);
	  }

  async get(id, params) {
    const result = await super.get(id, params);

    // Verify access
    if (params.user) {
      if (params.user.role === 'subcon-admin' && result.company.toString() !== params.user.company.toString()) {
        throw new Error('Access denied');
      } else if (params.user.role === 'agent') {
        const companies = await this.app.service('companies').find({
          query: {
            agent: params.user._id,
            _id: result.company,
            $limit: 1
          },
          paginate: false
        });

        if (companies.length === 0) {
          throw new Error('Access denied');
        }
      }
    }

    return result;
  }

  async patch(id, data, params) {
    // Prevent changing company
    delete data.company;

    return super.patch(id, data, params);
  }

  async update(id, data, params) {
    // Prevent changing company
    delete data.company;

    return super.update(id, data, params);
  }
};

