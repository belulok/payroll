const { Notifications } = require('./notifications.class');
const hooks = require('./notifications.hooks');
const Notification = require('../../models/notification.model');

module.exports = function (app) {
  const options = {
    Model: Notification,
    paginate: {
      default: 20,
      max: 100
    },
    multi: ['patch', 'remove'],
    whitelist: ['$regex', '$options', '$or', '$ne', '$addToSet']
  };

  // Initialize the service
  app.use('/notifications', new Notifications(options, app));

  // Get the service
  const service = app.service('notifications');

  // Apply hooks
  service.hooks(hooks);

  // Custom routes for notification actions

  // Mark notification as read
  app.post('/notifications/:id/read', async (req, res) => {
    try {
      const user = req.feathers?.user;
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const result = await service.markAsRead(req.params.id, user._id);
      res.json(result);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Error marking notification as read' });
    }
  });

  // Mark all as read
  app.post('/notifications/mark-all-read', async (req, res) => {
    try {
      const user = req.feathers?.user;
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const result = await service.markAllAsRead(user._id, user.company);
      res.json(result);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Error marking all notifications as read' });
    }
  });

  console.log('🔔 Notifications service initialized');
};
