const { authenticate } = require('@feathersjs/authentication').hooks;
const { iff, isProvider, disallow } = require('feathers-hooks-common');

// Permission check hook
const checkPermissions = async (context) => {
  const { user } = context.params;
  
  if (!user) {
    throw new Error('Authentication required');
  }

  // Only admin and subcon-admin can manage invoices
  if (!['admin', 'subcon-admin'].includes(user.role)) {
    throw new Error('Insufficient permissions to access invoices');
  }

  return context;
};

// Company filter hook
const addCompanyFilter = async (context) => {
  const { user } = context.params;
  
  if (user && user.companyId && user.role !== 'admin') {
    context.params.query = {
      ...context.params.query,
      companyId: user.companyId
    };
  }

  return context;
};

// Validate invoice data
const validateInvoiceData = async (context) => {
  const { data } = context;

  if (context.method === 'create' || context.method === 'patch') {
    // Validate required fields for create
    if (context.method === 'create') {
      if (!data.clientId) {
        throw new Error('Client is required');
      }
      if (!data.projectId) {
        throw new Error('Project is required');
      }
      if (!data.startDate || !data.endDate) {
        throw new Error('Start date and end date are required');
      }
    }

    // Validate date range
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      
      if (start >= end) {
        throw new Error('End date must be after start date');
      }
    }

    // Validate tax rate
    if (data.taxRate !== undefined && (data.taxRate < 0 || data.taxRate > 100)) {
      throw new Error('Tax rate must be between 0 and 100');
    }
  }

  return context;
};

// Populate related data
const populateData = async (context) => {
  if (context.method === 'create' && context.result) {
    // Populate client and project names
    const { app } = context;
    
    if (context.data.clientId && !context.data.clientName) {
      const client = await app.service('clients').get(context.data.clientId);
      context.result.clientName = client.name;
    }
    
    if (context.data.projectId && !context.data.projectName) {
      const project = await app.service('projects').get(context.data.projectId);
      context.result.projectName = project.name;
    }
  }

  return context;
};

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [checkPermissions, addCompanyFilter],
    get: [checkPermissions, addCompanyFilter],
    create: [checkPermissions, validateInvoiceData],
    update: [checkPermissions, validateInvoiceData],
    patch: [checkPermissions, validateInvoiceData],
    remove: [checkPermissions]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [populateData],
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
