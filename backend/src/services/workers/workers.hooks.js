const { authenticate } = require('@feathersjs/authentication');
const populateUser = require('../../hooks/populate-user');
const { filterByCompany, verifyAgentAccess, setCompanyOnCreate } = require('../../hooks/filter-by-company');

// Hook to create user account for new worker
const createUserAccount = () => {
  return async (context) => {
    const { app, result } = context;

    // Only run for single worker creation (not bulk)
    if (!result || Array.isArray(result) || (result.data && Array.isArray(result.data))) {
      return context;
    }

    const worker = result;

    // Generate random password
    const generatePassword = () => {
      const length = 12;
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return password;
    };

    try {
      // Check if user with this email already exists
      const existingUsers = await app.service('users').find({
        query: {
          email: worker.email,
          $limit: 1
        },
        provider: undefined // Internal call
      });

      if (existingUsers.total > 0) {
        console.log(`User account already exists for email: ${worker.email}`);
        // Link the existing user to this worker
        const existingUser = existingUsers.data[0];
        await app.service('workers').patch(worker._id, {
          user: existingUser._id
        }, { provider: undefined });
        result.user = existingUser._id;
        return context;
      }

      const password = generatePassword();

      // Create user account
      const user = await app.service('users').create({
        email: worker.email,
        password: password,
        firstName: worker.firstName,
        lastName: worker.lastName,
        role: 'worker',
        company: worker.company,
        worker: worker._id
      }, { provider: undefined }); // Internal call

      // Update worker with user reference
      await app.service('workers').patch(worker._id, {
        user: user._id
      }, { provider: undefined });

      // Add the generated password to the result so frontend can display it
      result.generatedPassword = password;
      result.user = user._id;

    } catch (error) {
      console.error('Error creating user account for worker:', error);
      // Don't fail the worker creation if user creation fails
      // Just log the error
    }

    return context;
  };
};

// Hook to populate company, lineManager, and client fields
const populateReferences = () => {
	return async (context) => {
		const { app, result, params } = context;

		// Allow internal service calls to opt-out of population to avoid recursion
		if (params && params.skipPopulate) {
			return context;
		}

		console.log('[Workers Hook] populateReferences called, result type:', Array.isArray(result) ? 'array' : typeof result);

		// Helper function to populate a single record
		const populate = async (record) => {
			if (!record) return record;

      console.log('[Workers Hook] Populating worker:', record.employeeId, 'company:', typeof record.company);

			// Populate company
      if (
        record.company &&
        (typeof record.company === 'string' ||
          (typeof record.company === 'object' && !record.company.name))
      ) {
        try {
          const companyId =
            typeof record.company === 'string'
              ? record.company
              : record.company._id || record.company.toString();

          if (companyId) {
            console.log('[Workers Hook] Fetching company:', companyId);
						// Use a clean internal call without user context to bypass permission checks
						const company = await app.service('companies').get(companyId, {
							provider: undefined,
							query: {}
						});
            record.company = {
              _id: company._id,
              name: company.name,
              registrationNumber: company.registrationNumber
            };
            console.log('[Workers Hook] Company populated:', record.company.name);
          }
        } catch (error) {
          console.error('[Workers Hook] Error populating company:', error.message);
        }
      }

      // Populate lineManager
      if (
        record.lineManager &&
        (typeof record.lineManager === 'string' ||
          (typeof record.lineManager === 'object' && !record.lineManager.firstName))
      ) {
        try {
          const managerId =
            typeof record.lineManager === 'string'
              ? record.lineManager
              : record.lineManager._id;

          if (managerId) {
            console.log('[Workers Hook] Fetching lineManager:', managerId);
						// Internal call to workers service to fetch basic manager info.
						// Pass through the same user context, and set skipPopulate so
						// we don't recursively populate references for the manager.
						const manager = await app.service('workers').get(managerId, {
							...params,
							provider: undefined,
							skipPopulate: true
						});
            // Only return basic info to avoid circular references
            record.lineManager = {
              _id: manager._id,
              firstName: manager.firstName,
              lastName: manager.lastName,
              employeeId: manager.employeeId,
              position: manager.position
            };
            console.log('[Workers Hook] LineManager populated:', record.lineManager.firstName);
          }
        } catch (error) {
          console.error('[Workers Hook] Error populating lineManager:', error.message);
        }
      }

      // Note: project is stored as a string name, not an ObjectId reference

	      // Populate client (deprecated - for backward compatibility)
	      if (record.client) {
	        try {
	          // Determine the client id from different possible shapes
	          const clientId =
	            typeof record.client === 'string'
	              ? record.client
	              : (typeof record.client === 'object' && record.client._id)
	                ? record.client._id.toString()
	                : (typeof record.client.toString === 'function'
	                  ? record.client.toString()
	                  : null);

	          if (clientId) {
	            // Use the same user context as the original workers request so
	            // client access checks pass, but treat this as an internal call
	            // (provider: undefined) so authentication is not re-run.
	            const client = await app.service('clients').get(clientId, {
	              ...params,
	              provider: undefined
	            });

	            // Only assign minimal fields needed on the frontend
	            record.client = {
	              _id: client._id,
	              name: client.name,
	              contactPerson: client.contactPerson,
	              email: client.email
	            };
	          }
	        } catch (error) {
	          // Silently fail if client cannot be populated
	        }
	      }

      return record;
    };

    // Handle both single result and paginated results
    if (result) {
      if (Array.isArray(result)) {
        // Non-paginated array
        context.result = await Promise.all(result.map(populate));
      } else if (result.data && Array.isArray(result.data)) {
        // Paginated result
        result.data = await Promise.all(result.data.map(populate));
      } else {
        // Single result
        context.result = await populate(result);
      }
    }

    return context;
  };
};

module.exports = {
  before: {
    all: [authenticate('jwt'), populateUser()],
    find: [filterByCompany()],
    get: [filterByCompany()],
    create: [setCompanyOnCreate()],
    update: [filterByCompany()],
    patch: [filterByCompany()],
    remove: [filterByCompany()]
  },

  after: {
    all: [populateReferences()],
    find: [],
    get: [verifyAgentAccess()],
    create: [createUserAccount()],
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

