const { authenticate } = require('@feathersjs/authentication');
const populateUser = require('../../hooks/populate-user');
const {
  checkTimesheetEditPermissions,
  checkTimesheetViewPermissions,
  validateTimesheetCompany
} = require('../../hooks/timesheet-permissions');

// Filter timesheets by client (for client users) - runs after population
const filterByClientAfterPopulate = () => {
  return async (context) => {
    const { params, result } = context;

    if (!params._filterByClientId || !result) {
      return context;
    }

    const clientId = params._filterByClientId.toString();

    const filterByClient = (timesheet) => {
      if (!timesheet || !timesheet.worker) return false;
      
      // Check if worker's client matches
      const workerClient = timesheet.worker.client;
      if (workerClient) {
        const workerClientId = typeof workerClient === 'object' 
          ? workerClient._id?.toString() 
          : workerClient?.toString();
        return workerClientId === clientId;
      }
      return false;
    };

    if (Array.isArray(result)) {
      context.result = result.filter(filterByClient);
    } else if (result.data && Array.isArray(result.data)) {
      result.data = result.data.filter(filterByClient);
      result.total = result.data.length;
    }

    return context;
  };
};

// Hook to populate worker field with nested relations
const populateWorker = () => {
  return async (context) => {
    const { app, result } = context;

    // Helper function to populate a single record
    const populate = async (record) => {
      if (record && record.worker) {
        const workersService = app.service('workers');
        const projectsService = app.service('projects');
        const clientsService = app.service('clients');
        const companiesService = app.service('companies');
        const tasksService = app.service('tasks');

        try {
          // Populate worker
          record.worker = await workersService.get(record.worker);

          // Populate company
          if (record.company) {
            try {
              record.company = await companiesService.get(record.company);
            } catch (error) {
              console.error('Error populating company:', error);
            }
          }

          // Populate lineManager if exists
          if (record.worker.lineManager) {
            try {
              record.worker.lineManager = await workersService.get(record.worker.lineManager);
            } catch (error) {
              console.error('Error populating lineManager:', error);
            }
          }

          // Populate project if exists
          if (record.worker.project) {
            try {
              record.worker.project = await projectsService.get(record.worker.project);

              // Populate client within project
              if (record.worker.project.client) {
                try {
                  record.worker.project.client = await clientsService.get(record.worker.project.client);
                } catch (error) {
                  console.error('Error populating client:', error);
                }
              }
            } catch (error) {
              console.error('Error populating project:', error);
            }
          }

          // Populate task if exists
          if (record.task) {
            try {
              record.task = await tasksService.get(record.task);
            } catch (error) {
              console.error('Error populating task:', error);
            }
          }
        } catch (error) {
          console.error('Error populating worker:', error);
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
    find: [checkTimesheetViewPermissions()],
    get: [checkTimesheetViewPermissions()],
    create: [validateTimesheetCompany()],
    update: [checkTimesheetEditPermissions(), validateTimesheetCompany()],
    patch: [checkTimesheetEditPermissions(), validateTimesheetCompany()],
    remove: [checkTimesheetEditPermissions()]
  },

  after: {
    all: [populateWorker()],
    find: [filterByClientAfterPopulate()],
    get: [filterByClientAfterPopulate()],
    create: [],
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

