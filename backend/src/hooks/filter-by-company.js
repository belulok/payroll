const { Forbidden, NotAuthenticated } = require('@feathersjs/errors');

/**
 * Hook to filter data by company based on user role
 * - Admin: sees all
 * - Agent: sees only their assigned companies
 * - Subcon-admin/clerk: sees only their company
 * - Worker: sees only their company data
 *
 * @param {Object} options
 * @param {string} options.companyField - The field name for company reference (default: 'company')
 */
function filterByCompany(options = {}) {
  const { companyField = 'company' } = options;

  return async context => {
    const { params, method, app } = context;
    const user = params.user;

    // Skip for internal calls
    if (!params.provider) {
      return context;
    }

    if (!user) {
      throw new NotAuthenticated('Not authenticated');
    }

    // Admin sees everything
    if (user.role === 'admin') {
      return context;
    }

    // Agent sees only their assigned companies
    if (user.role === 'agent') {
      // Fetch latest user data from database to get updated companies list
      let latestUser;
      try {
        latestUser = await app.service('users').get(user._id, { provider: undefined });
      } catch (err) {
        latestUser = user;
      }

      const agentCompanies = latestUser.companies || [];

      if (agentCompanies.length > 0) {
        params.query = params.query || {};

        if (method === 'find') {
          // For find, filter by companies
          params.query[companyField] = { $in: agentCompanies };
        } else if (method === 'get' && context.id) {
          // For get, we'll verify after fetching
          // Store companies for after hook verification
          params._agentCompanies = agentCompanies;
        }
      } else {
        // Agent with no companies assigned - return empty
        if (method === 'find') {
          params.query = params.query || {};
          params.query[companyField] = { $in: [] }; // This will return nothing
        }
      }
      return context;
    }

    // Subcon-admin and subcon-clerk see only their company
    if (user.role === 'subcon-admin' || user.role === 'subcon-clerk') {
      if (user.company) {
        params.query = params.query || {};
        params.query[companyField] = user.company;
      } else {
        throw new Forbidden('User not assigned to a company');
      }
      return context;
    }

    // Worker sees only their company data
    if (user.role === 'worker') {
      if (user.company) {
        params.query = params.query || {};
        params.query[companyField] = user.company;
      }
      return context;
    }

    return context;
  };
}

/**
 * After hook to verify agent has access to the fetched record
 */
function verifyAgentAccess(options = {}) {
  const { companyField = 'company' } = options;

  return async context => {
    const { params, result, method, app } = context;
    const user = params.user;

    // Only for get method and agent role
    if (method !== 'get' || !user || user.role !== 'agent') {
      return context;
    }

    if (!result) {
      return context;
    }

    // Fetch latest user data from database
    let latestUser;
    try {
      latestUser = await app.service('users').get(user._id, { provider: undefined });
    } catch (err) {
      latestUser = user;
    }

    const agentCompanies = params._agentCompanies || latestUser.companies || [];

    if (agentCompanies.length === 0) {
      throw new Forbidden('Agent has no companies assigned');
    }

    // Get the company ID from the result
    const recordCompany = result[companyField];
    if (!recordCompany) {
      return context; // No company field, allow access
    }

    const companyId = typeof recordCompany === 'object' ? recordCompany._id?.toString() : recordCompany?.toString();
    const hasAccess = agentCompanies.some(c => c.toString() === companyId);

    if (!hasAccess) {
      throw new Forbidden('Access denied. This record belongs to a company not assigned to you.');
    }

    return context;
  };
}

/**
 * Hook to set company on create based on user
 */
function setCompanyOnCreate(options = {}) {
  const { companyField = 'company' } = options;

  return async context => {
    const { params, data, app } = context;
    const user = params.user;

    if (!user || !params.provider) {
      return context;
    }

    // For subcon-admin/clerk, always set their company
    if ((user.role === 'subcon-admin' || user.role === 'subcon-clerk') && user.company) {
      if (!data[companyField]) {
        data[companyField] = user.company;
      } else if (data[companyField].toString() !== user.company.toString()) {
        throw new Forbidden('Cannot create records for other companies');
      }
    }

    // For agent, verify they are allowed to use the company
    // An agent can create records for a company if EITHER:
    //  - they created the company (company.agent === user._id), OR
    //  - the company is in their `user.companies` list (assigned by an admin)
    if (user.role === 'agent' && data[companyField]) {
      try {
        // Normalise company id from payload (string or object)
        const rawCompanyValue = data[companyField];
        const companyId =
          typeof rawCompanyValue === 'object'
            ? (rawCompanyValue._id || rawCompanyValue).toString()
            : rawCompanyValue.toString();

        // Fetch the company without applying external provider hooks
        const company = await app.service('companies').get(companyId, {
          provider: undefined // Internal call
        });

        const companyAgentId = company.agent?.toString();
        const agentId = user._id.toString();

        // IMPORTANT: Fetch the latest user data from database to get updated companies list
        // This is needed because after creating a company, the user's JWT token
        // doesn't automatically update with the new company
        let latestUser;
        try {
          latestUser = await app.service('users').get(user._id, { provider: undefined });
        } catch (err) {
          latestUser = user;
        }

        // Companies explicitly assigned to the agent on the user document
        const assignedCompanyIds = (latestUser.companies || []).map(c => c.toString());

        const isCreator = companyAgentId === agentId;
        const isAssigned = assignedCompanyIds.includes(companyId);

        if (!isCreator && !isAssigned) {
          throw new Forbidden('Cannot create records for companies not assigned to you');
        }
      } catch (error) {
        if (error.message === 'Cannot create records for companies not assigned to you') {
          // Re-throw our intentional access error
          throw error;
        }
        // Any other error (e.g. company not found) should look like a generic
        // validation failure to the caller.
        console.error('Error in setCompanyOnCreate for agent:', error);
        throw new Forbidden('Invalid company');
      }
    }

    // For agent, require company to be specified
    if (user.role === 'agent' && !data[companyField]) {
      throw new Forbidden('Company ID is required');
    }

    return context;
  };
}

module.exports = {
  filterByCompany,
  verifyAgentAccess,
  setCompanyOnCreate
};
