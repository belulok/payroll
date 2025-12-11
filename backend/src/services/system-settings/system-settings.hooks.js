const { authenticate } = require('@feathersjs/authentication').hooks;

// Only allow admin/agent to modify global settings
const checkAdminAccess = async (context) => {
  const { user } = context.params;
  const { data } = context;

  // If modifying global settings (company is null), must be admin or agent
  if (data && data.company === null) {
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      throw new Error('Only admins can modify global settings');
    }
  }

  // If subcon-admin, can only modify their company's settings
  if (user && user.role === 'subcon-admin') {
    if (data && data.company && data.company !== user.company?.toString()) {
      throw new Error('Unauthorized access to settings');
    }
    // Force company to their own
    if (data) {
      data.company = user.company;
    }
  }

  return context;
};

// Set updatedBy
const setUpdatedBy = async (context) => {
  if (context.params.user) {
    context.data.updatedBy = context.params.user._id;
  }
  return context;
};

// Preserve existing password if empty password is sent during patch
const preservePassword = async (context) => {
  if (context.method === 'patch' && context.data.smtp) {
    // If password is empty/undefined, don't update it (keep existing)
    if (!context.data.smtp.password) {
      const existing = await context.service.get(context.id);
      if (existing && existing.smtp && existing.smtp.password) {
        context.data.smtp.password = existing.smtp.password;
      } else {
        delete context.data.smtp.password;
      }
    }
  }
  return context;
};

// Mask password in response - indicate if password is set without revealing it
const maskPassword = async (context) => {
  const maskDoc = (doc) => {
    if (doc && doc.smtp) {
      // Just indicate if password exists, don't return actual value or asterisks
      doc.smtp.hasPassword = !!doc.smtp.password;
      doc.smtp.password = ''; // Clear the password, never return it
    }
    return doc;
  };

  if (context.result.data) {
    context.result.data = context.result.data.map(maskDoc);
  } else if (Array.isArray(context.result)) {
    context.result = context.result.map(maskDoc);
  } else {
    maskDoc(context.result);
  }

  return context;
};

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [checkAdminAccess, setUpdatedBy],
    update: [checkAdminAccess, setUpdatedBy],
    patch: [checkAdminAccess, preservePassword, setUpdatedBy],
    remove: [checkAdminAccess]
  },

  after: {
    all: [],
    find: [maskPassword],
    get: [maskPassword],
    create: [maskPassword],
    update: [maskPassword],
    patch: [maskPassword],
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

