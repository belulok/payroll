const { authenticate } = require('@feathersjs/authentication');
const { Forbidden } = require('@feathersjs/errors');
const populateUser = require('../../hooks/populate-user');

// Filter companies based on user role
const filterCompanies = () => {
  return async context => {
    const { params, method, app } = context;
    const user = params.user;

    // Skip for internal calls
    if (!params.provider) {
      return context;
    }

    if (!user) {
      throw new Forbidden('Authentication required');
    }

    // Admin sees all companies
    if (user.role === 'admin') {
      return context;
    }

    // Agent sees companies they created OR companies assigned to them
    if (user.role === 'agent') {
      // Fetch latest user data to get updated companies list
      let latestUser;
      try {
        latestUser = await app.service('users').get(user._id, { provider: undefined });
      } catch (err) {
        latestUser = user;
      }

      const assignedCompanies = latestUser.companies || [];

      params.query = params.query || {};
      if (method === 'find') {
        // Show companies where agent is the creator OR company is in their assigned list
        params.query.$or = [
          { agent: user._id },
          { _id: { $in: assignedCompanies } }
        ];
      }
      return context;
    }

    // Subcon-admin and subcon-clerk see only their company
    if (user.role === 'subcon-admin' || user.role === 'subcon-clerk') {
      if (user.company) {
        params.query = params.query || {};
        if (method === 'find') {
          params.query._id = user.company;
        }
      } else {
        throw new Forbidden('User not assigned to a company');
      }
      return context;
    }

    // Workers see only their company
    if (user.role === 'worker') {
      if (user.company) {
        params.query = params.query || {};
        params.query._id = user.company;
      }
      return context;
    }

    return context;
  };
};

// Verify agent/subcon has access to specific company
const verifyCompanyAccess = () => {
  return async context => {
    const { params, result, method, app } = context;
    const user = params.user;

    if (method !== 'get' || !user || !params.provider) {
      return context;
    }

    if (!result) {
      return context;
    }

    // Admin has access to all
    if (user.role === 'admin') {
      return context;
    }

    const companyId = result._id?.toString();

    // Agent - check if they created this company OR it's in their companies list
    if (user.role === 'agent') {
      const agentId = result.agent?.toString();
      const isCreator = agentId === user._id.toString();

      // Fetch latest user data to get updated companies list
      let latestUser;
      try {
        latestUser = await app.service('users').get(user._id, { provider: undefined });
      } catch (err) {
        latestUser = user;
      }

      const assignedCompanies = (latestUser.companies || []).map(c => c.toString());
      const isAssigned = assignedCompanies.includes(companyId);

      if (!isCreator && !isAssigned) {
        throw new Forbidden('Access denied. You can only access companies you created or are assigned to.');
      }
      return context;
    }

    // Subcon - check if it's their company
    if (user.role === 'subcon-admin' || user.role === 'subcon-clerk') {
      if (user.company?.toString() !== companyId) {
        throw new Forbidden('Access denied. You can only access your own company.');
      }
      return context;
    }

    // Worker - check if it's their company
    if (user.role === 'worker') {
      if (user.company?.toString() !== companyId) {
        throw new Forbidden('Access denied.');
      }
      return context;
    }

    return context;
  };
};

// Check create/edit permissions and set agent field
const checkCompanyPermissions = () => {
  return async context => {
    const { params, method, data } = context;
    const user = params.user;

    if (!params.provider) {
      return context;
    }

    if (!user) {
      throw new Forbidden('Authentication required');
    }

    // Only admin and agent can create companies
    if (method === 'create') {
      if (!['admin', 'agent'].includes(user.role)) {
        throw new Forbidden('Only admin and agent can create companies');
      }

      // If agent creates a company, set the agent field to their user ID
      if (user.role === 'agent') {
        data.agent = user._id;
        console.log(`📁 Setting agent field to ${user._id} for new company`);
      }
    }

    // Only admin can delete companies
    if (method === 'remove') {
      if (user.role !== 'admin') {
        throw new Forbidden('Only admin can delete companies');
      }
    }

    return context;
  };
};

// Add company to agent's list after creation
const addCompanyToAgent = () => {
  return async context => {
    const { result, params, app } = context;
    const user = params.user;

    // If agent creates a company, add it to their companies list
    if (user && user.role === 'agent' && result && result._id) {
      try {
        const currentCompanies = user.companies || [];
        const newCompanyId = result._id.toString();

        // Only add if not already in list
        if (!currentCompanies.some(c => c.toString() === newCompanyId)) {
          // Use internal call (no provider) to bypass authentication
          await app.service('users').patch(user._id, {
            $push: { companies: result._id }
          }, { provider: undefined }); // Internal call
          console.log(`📁 Added company ${result.name} to agent ${user.email}'s companies list`);
        }
      } catch (error) {
        console.error('Error adding company to agent:', error.message);
      }
    }

    return context;
  };
};

module.exports = {
  before: {
    all: [authenticate('jwt'), populateUser()],
    find: [filterCompanies()],
    get: [filterCompanies()],
    create: [checkCompanyPermissions()],
    update: [filterCompanies()],
    patch: [filterCompanies()],
    remove: [checkCompanyPermissions()]
  },

  after: {
    all: [
      // Populate agent field with user details
      async context => {
        const { app, result } = context;

        if (!result) return context;

        const populateAgent = async (company) => {
          if (company.agent) {
            try {
              const agent = await app.service('users').get(company.agent, {
                query: { $select: ['_id', 'firstName', 'lastName', 'email'] }
              });
              company.agent = agent;
            } catch (error) {
              console.error('Error populating agent:', error.message);
            }
          }
          return company;
        };

        if (Array.isArray(result.data)) {
          // Paginated results
          result.data = await Promise.all(result.data.map(populateAgent));
        } else if (Array.isArray(result)) {
          // Non-paginated array
          context.result = await Promise.all(result.map(populateAgent));
        } else {
          // Single result
          context.result = await populateAgent(result);
        }

        return context;
      }
    ],
    find: [],
    get: [verifyCompanyAccess()],
    create: [addCompanyToAgent()],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
