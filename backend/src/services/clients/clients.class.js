const { Service } = require('feathers-mongoose');

exports.Clients = class Clients extends Service {
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
	      // Subcon-admin can only ever see their own company
	      if (user.role === 'subcon-admin') {
	        params.query = {
	          ...originalQuery,
	          // Force company to the subcon's company regardless of what the
	          // frontend requested. This guarantees they never see other
	          // companies' clients.
	          company: user.company
	        };
	      } else if (user.role === 'agent') {
	        // Agent can see clients only from companies they manage.
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
	          // Frontend explicitly requested a company. Respect that filter,
	          // but make sure it is within the agent's allowed companies.
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

	          // Keep the original company filter (scoped per selected company
	          // in the UI) so the frontend can see a different set of clients
	          // when switching companies.
	          params.query = { ...originalQuery };
	        } else {
	          // No explicit company filter: default to all companies the agent
	          // manages.
	          params.query = {
	            ...originalQuery,
	            company: { $in: allowedCompanyIds }
	          };
	        }
	      }
	      // Admin can see all clients (no additional filter)
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

