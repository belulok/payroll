const createModel = require('../../models/leave-request.model');
const { LeaveRequests } = require('./leave-requests.class');
const hooks = require('./leave-requests.hooks');

// Express middleware for JWT authentication
const expressAuth = (app) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const token = authHeader.substring(7);
    const authService = app.service('authentication');
    const result = await authService.verifyAccessToken(token);
    const User = app.service('users').Model;
    const user = await User.findById(result.sub);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/leave-requests', new LeaveRequests(options, app));
  const service = app.service('leave-requests');
  service.hooks(hooks);

  const authenticate = expressAuth(app);

  // Approve leave request
  app.post('/leave-requests/:id/approve', authenticate, async (req, res) => {
    try {
      const user = req.user;
      if (!['admin', 'agent', 'subcon-admin'].includes(user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      const result = await service.approve(req.params.id, { user });
      res.json(result);
    } catch (error) {
      console.error('Approve error:', error.message);
      res.status(400).json({ message: error.message });
    }
  });

  // Cancel leave request - workers can cancel their own, admin/agent/subcon-admin can cancel any
  app.post('/leave-requests/:id/cancel', authenticate, async (req, res) => {
    try {
      const user = req.user;
      const leaveRequest = await service.get(req.params.id);
      const workerIdStr = leaveRequest.worker?._id?.toString() || leaveRequest.worker?.toString();

      if (user.role === 'worker') {
        if (workerIdStr !== user.workerId?.toString()) {
          return res.status(403).json({ message: 'Can only cancel your own leave' });
        }
      } else if (!['admin', 'agent', 'subcon-admin'].includes(user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const result = await service.cancel(req.params.id, { user });
      res.json(result);
    } catch (error) {
      console.error('Cancel error:', error.message);
      res.status(400).json({ message: error.message });
    }
  });
};
