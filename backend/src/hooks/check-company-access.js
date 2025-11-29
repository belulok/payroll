// Hook to check if user has access to company resources
module.exports = function checkCompanyAccess(options = {}) {
	return async context => {
		const { user, provider } = context.params;

		// Allow internal service calls (no external provider) to bypass
		// company access checks. This is important for server-side hooks
		// like workers.populateReferences that need to read company data
		// to populate responses.
		if (!provider) {
			return context;
		}

		if (!user) {
			throw new Error('Not authenticated');
		}

		// System admin has access to everything
		if (user.role === 'admin') {
			return context;
		}

    // Subcon admin can only access their own company
    if (user.role === 'subcon-admin') {
      // For GET requests
      if (context.method === 'get') {
        if (context.id && context.id !== user.company.toString()) {
          throw new Error('Unauthorized access to company');
        }
      }

      // For FIND requests
      if (context.method === 'find') {
        context.params.query = context.params.query || {};
        context.params.query._id = user.company;
      }

      // For CREATE/UPDATE/PATCH/REMOVE
      if (['create', 'update', 'patch', 'remove'].includes(context.method)) {
        if (context.id && context.id !== user.company.toString()) {
          throw new Error('Unauthorized access to company');
        }
      }
    }

    // Workers cannot access company service
    if (user.role === 'worker') {
      throw new Error('Workers cannot access company information');
    }

    return context;
  };
};

