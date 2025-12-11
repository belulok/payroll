const { Service } = require('feathers-mongoose');

class Notifications extends Service {
  constructor(options, app) {
    super(options, app);
    this.app = app;
  }

  // Override get to handle special routes like "unread-count"
  async get(id, params) {
    // Handle special IDs
    if (id === 'unread-count') {
      if (!params.user) {
        throw new Error('Not authenticated');
      }
      const count = await this.getUnreadCount(params.user._id, params.user.company);
      return { count };
    }

    // Default behavior for normal ObjectIds
    return super.get(id, params);
  }

  // Override find to filter by company and optionally by user
  async find(params) {
    if (params.user) {
      params.query = params.query || {};
      params.query.company = params.user.company;

      // Get notifications for this user or global notifications (user: null)
      params.query.$or = [
        { user: params.user._id },
        { user: null }
      ];
    }

    // Default sort by createdAt descending
    if (!params.query?.$sort) {
      params.query = params.query || {};
      params.query.$sort = { createdAt: -1 };
    }

    return super.find(params);
  }

  // Get unread count for user
  async getUnreadCount(userId, companyId) {
    const Notification = this.Model;

    const count = await Notification.countDocuments({
      company: companyId,
      $or: [
        { user: userId },
        { user: null }
      ],
      'readBy.user': { $ne: userId }
    });

    return count;
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    const Notification = this.Model;

    await Notification.updateOne(
      { _id: notificationId },
      {
        $addToSet: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    return { success: true };
  }

  // Mark all as read for user
  async markAllAsRead(userId, companyId) {
    const Notification = this.Model;

    await Notification.updateMany(
      {
        company: companyId,
        $or: [
          { user: userId },
          { user: null }
        ],
        'readBy.user': { $ne: userId }
      },
      {
        $addToSet: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    return { success: true };
  }

  // Create notification helper
  async createNotification(data) {
    const {
      company,
      user,
      type,
      title,
      message,
      relatedEntity,
      priority = 'normal'
    } = data;

    return this.create({
      company,
      user: user || null,
      type,
      title,
      message,
      relatedEntity,
      priority,
      readBy: [],
      emailSent: false
    });
  }
}

exports.Notifications = Notifications;

