// Hook to populate user information in params
module.exports = function populateUser() {
  return async context => {
    const { params } = context;
    
    // If user is authenticated, fetch full user details
    if (params.user && params.user._id) {
      const userService = context.app.service('users');
      const user = await userService.get(params.user._id);
      params.user = user;
    }
    
    return context;
  };
};

