const { authenticate } = require('@feathersjs/authentication').hooks;
const { filterByCompany, verifyAgentAccess, setCompanyOnCreate } = require('../../hooks/filter-by-company');

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

// Hook to check for existing client by email and handle accordingly
const handleDuplicateClient = () => {
  return async (context) => {
    const { app, data } = context;

    if (!data.email) {
      return context;
    }

    // Check if a client with this email already exists
    const existingClients = await app.service('clients').find({
      query: {
        email: data.email,
        $limit: 1
      },
      provider: undefined // Internal call
    });

    if (existingClients.total > 0) {
      const existingClient = existingClients.data[0];
      
      // Add this company to the existing client's companies array
      const companyId = data.company;
      const existingCompanies = existingClient.companies || [];
      
      if (!existingCompanies.some(c => c.toString() === companyId.toString())) {
        // Update the existing client to include this company
        await app.service('clients').patch(existingClient._id, {
          $addToSet: { companies: companyId }
        }, { provider: undefined });
        
        console.log(`📋 Added company ${companyId} to existing client ${existingClient.name}`);
      }
      
      // Return the existing client instead of creating a new one
      context.result = existingClient;
      return context;
    }

    // If no existing client, initialize companies array with the creating company
    data.companies = [data.company];
    
    return context;
  };
};

// Hook to create user account for new client
const createClientUserAccount = () => {
  return async (context) => {
    const { app, result, data } = context;

    // Skip if result was set by handleDuplicateClient (existing client)
    if (!result || !result._id) {
      return context;
    }

    const client = result;

    // Skip if client already has a user account
    if (client.user) {
      return context;
    }

    // Skip if no email provided
    if (!client.email) {
      console.log('📋 Client created without email - no user account created');
      return context;
    }

    try {
      // Check if user with this email already exists
      const existingUsers = await app.service('users').find({
        query: {
          email: client.email,
          $limit: 1
        },
        provider: undefined
      });

      if (existingUsers.total > 0) {
        const existingUser = existingUsers.data[0];
        console.log(`📋 User account already exists for email: ${client.email}`);
        
        // If existing user is already a client, link them
        if (existingUser.role === 'client') {
          await app.service('clients').patch(client._id, {
            user: existingUser._id
          }, { provider: undefined });
          result.user = existingUser._id;
        }
        return context;
      }

      const password = generatePassword();

      // Create user account for client
      const user = await app.service('users').create({
        email: client.email,
        password: password,
        firstName: client.contactPerson?.split(' ')[0] || client.name,
        lastName: client.contactPerson?.split(' ').slice(1).join(' ') || 'Client',
        role: 'client',
        client: client._id
      }, { provider: undefined });

      // Update client with user reference
      await app.service('clients').patch(client._id, {
        user: user._id
      }, { provider: undefined });

      // Add the generated password to the result
      result.generatedPassword = password;
      result.user = user._id;

      console.log(`📋 Created user account for client: ${client.name} (${client.email})`);

    } catch (error) {
      console.error('Error creating user account for client:', error);
    }

    return context;
  };
};

// Filter for client role - they can only see their own data
const filterForClientRole = () => {
  return async (context) => {
    const { params, method } = context;
    const user = params.user;

    if (!params.provider || !user) {
      return context;
    }

    // If user is a client, they can only see their own client record
    if (user.role === 'client' && user.client) {
      if (method === 'find') {
        params.query = params.query || {};
        params.query._id = user.client;
      } else if (method === 'get' && context.id) {
        // Verify they're accessing their own record
        if (context.id.toString() !== user.client.toString()) {
          const { Forbidden } = require('@feathersjs/errors');
          throw new Forbidden('You can only access your own client record');
        }
      }
    }

    return context;
  };
};

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [filterForClientRole(), filterByCompany()],
    get: [filterForClientRole(), filterByCompany()],
    create: [setCompanyOnCreate(), handleDuplicateClient()],
    update: [filterForClientRole(), filterByCompany()],
    patch: [filterForClientRole(), filterByCompany()],
    remove: [filterByCompany()]
  },

  after: {
    all: [],
    find: [],
    get: [verifyAgentAccess()],
    create: [createClientUserAccount()],
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
