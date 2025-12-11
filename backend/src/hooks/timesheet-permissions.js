const { Forbidden } = require('@feathersjs/errors');

/**
 * Hook to check if user has permission to edit timesheets
 * Admin, agent, and subcon-admin roles can edit timesheets
 * Approved timesheets cannot be edited
 */
function checkTimesheetEditPermissions() {
  return async context => {
    const { method, params, id, app } = context;

    // Only apply to PATCH, PUT, and DELETE operations
    if (!['patch', 'update', 'remove'].includes(method)) {
      return context;
    }

    // Skip for internal calls (no provider = internal service call)
    if (!params.provider) {
      return context;
    }

    // Check if user is authenticated
    if (!params.user) {
      throw new Forbidden('Authentication required to edit timesheets');
    }

    const userRole = params.user.role;

    // Allow admin, agent, and subcon-admin to edit timesheets
    const allowedRoles = ['admin', 'agent', 'subcon-admin'];

    if (!allowedRoles.includes(userRole)) {
      throw new Forbidden(`Access denied. Only ${allowedRoles.join(', ')} can edit timesheets. Your role: ${userRole}`);
    }

    // Check if timesheet is approved (cannot be edited once approved)
    if (id) {
      try {
        const timesheetService = app.service('timesheets');
        const timesheet = await timesheetService.get(id);

        if (timesheet.status === 'approved') {
          throw new Forbidden('Cannot edit approved timesheets. Approved timesheets are locked.');
        }
      } catch (error) {
        if (error.name === 'Forbidden') {
          throw error;
        }
        // If timesheet not found, let the main operation handle it
      }
    }

    // Log the edit action for audit purposes
    console.log(`📝 Timesheet edit by ${params.user.firstName} ${params.user.lastName} (${userRole}) - Method: ${method.toUpperCase()}`);

    return context;
  };
}

/**
 * Hook to check if user has permission to view timesheets
 * Workers can only view their own timesheets
 * Subcon-admin/clerk can view timesheets from their company
 * Agent can view timesheets from their assigned companies
 * Admin can view all timesheets
 */
function checkTimesheetViewPermissions() {
  return async context => {
    const { method, params, id } = context;

    // Only apply to GET operations
    if (method !== 'find' && method !== 'get') {
      return context;
    }

    // Skip for internal calls (no provider = internal service call)
    if (!params.provider) {
      return context;
    }

    // Check if user is authenticated
    if (!params.user) {
      throw new Forbidden('Authentication required to view timesheets');
    }

    const userRole = params.user.role;

    // Admin can view all timesheets
    if (userRole === 'admin') {
      return context;
    }

    // Agent can view timesheets from their assigned companies
    if (userRole === 'agent') {
      if (params.user.companies && params.user.companies.length > 0) {
        // Filter by assigned companies
        params.query = params.query || {};
        params.query.company = { $in: params.user.companies };
      }
      // If agent has no companies assigned, they can still access (will return empty)
      return context;
    }

    // Subcon-admin and subcon-clerk can view timesheets from their company
    if (userRole === 'subcon-admin' || userRole === 'subcon-clerk') {
      if (params.user.company) {
        // Add company filter to query
        params.query = params.query || {};
        params.query.company = params.user.company;
      }
      return context;
    }

    // Workers can only view their own timesheets
    if (userRole === 'worker') {
      if (params.user.worker) {
        // Add worker filter to query
        params.query = params.query || {};
        params.query.worker = params.user.worker;
      } else {
        throw new Forbidden('Worker account not properly linked');
      }
      return context;
    }

    // Other roles are not allowed to view timesheets
    throw new Forbidden(`Access denied. Role '${userRole}' cannot view timesheets`);
  };
}

/**
 * Hook to ensure timesheet data integrity
 * Validates that the timesheet belongs to the correct company
 */
function validateTimesheetCompany() {
  return async context => {
    const { method, params, data } = context;

    // Only apply to CREATE and UPDATE operations
    if (!['create', 'patch', 'update'].includes(method)) {
      return context;
    }

    // Skip for internal calls (no provider = internal service call)
    if (!params.provider) {
      return context;
    }

    // Check if user is authenticated
    if (!params.user) {
      return context;
    }

    const userRole = params.user.role;

    // Admin can create/edit timesheets for any company
    if (userRole === 'admin') {
      return context;
    }

    // Agent can create/edit timesheets for their assigned companies
    if (userRole === 'agent') {
      if (params.user.companies && params.user.companies.length > 0) {
        // Ensure the timesheet belongs to one of the agent's companies
        if (data && data.company) {
          const companyIds = params.user.companies.map(c => c.toString());
          if (!companyIds.includes(data.company.toString())) {
            throw new Forbidden('Cannot create/edit timesheets for companies not assigned to you');
          }
        }
      }
      return context;
    }

    // Subcon-admin can only create/edit timesheets for their company
    if (userRole === 'subcon-admin') {
      if (params.user.company) {
        // Ensure the timesheet belongs to the user's company
        if (data && data.company && data.company.toString() !== params.user.company.toString()) {
          throw new Forbidden('Cannot create/edit timesheets for other companies');
        }

        // If no company specified in data, set it to user's company
        if (data && !data.company) {
          data.company = params.user.company;
        }
      }
      return context;
    }

    // Workers cannot create/edit timesheets
    if (userRole === 'worker') {
      throw new Forbidden('Workers cannot create or edit timesheets');
    }

    return context;
  };
}

module.exports = {
  checkTimesheetEditPermissions,
  checkTimesheetViewPermissions,
  validateTimesheetCompany
};
