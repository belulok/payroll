'use client';

import { useState } from 'react';
import {
  BellIcon,
  CheckIcon,
  FunnelIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow, format } from 'date-fns';

const notificationTypeConfig: Record<string, { icon: React.ComponentType<any>; color: string; bgColor: string; label: string }> = {
  document_expiry: { icon: DocumentTextIcon, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Document Expiry' },
  timesheet_reminder: { icon: ClockIcon, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Timesheet Reminder' },
  timesheet_approved: { icon: CheckIcon, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Timesheet Approved' },
  timesheet_rejected: { icon: ClockIcon, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Timesheet Rejected' },
  payroll_generated: { icon: CurrencyDollarIcon, color: 'text-emerald-600', bgColor: 'bg-emerald-100', label: 'Payroll Generated' },
  leave_request: { icon: CalendarDaysIcon, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Leave Request' },
  leave_approved: { icon: CalendarDaysIcon, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Leave Approved' },
  leave_rejected: { icon: CalendarDaysIcon, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Leave Rejected' },
  system: { icon: Cog6ToothIcon, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'System' },
  info: { icon: InformationCircleIcon, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Information' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-gray-200 text-gray-700', label: 'Low' },
  normal: { color: 'bg-blue-100 text-blue-700', label: 'Normal' },
  high: { color: 'bg-orange-100 text-orange-700', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-700', label: 'Urgent' },
};

type FilterType = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: notifications = [], isLoading, refetch } = useNotifications(100);
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const isRead = (notification: Notification) => {
    return notification.readBy?.some(r => r.user === currentUserId);
  };

  const filteredNotifications = notifications.filter((n: Notification) => {
    // Filter by read/unread
    if (filter === 'unread' && isRead(n)) return false;
    if (filter === 'read' && !isRead(n)) return false;

    // Filter by type
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;

    return true;
  });

  const handleMarkAsRead = (notification: Notification) => {
    if (!isRead(notification)) {
      markAsRead.mutate(notification._id);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  const formatTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const formatFullDate = (date: string) => {
    try {
      return format(new Date(date), 'MMM d, yyyy h:mm a');
    } catch {
      return '';
    }
  };

  const uniqueTypes = [...new Set(notifications.map((n: Notification) => n.type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BellIcon className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markAllAsRead.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckIcon className="h-5 w-5" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Read/Unread Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['all', 'unread', 'read'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'unread' && unreadCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {notificationTypeConfig[type]?.label || type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BellIcon className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm">
              {filter === 'unread' ? "You're all caught up!" : "You don't have any notifications yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification: Notification) => {
              const read = isRead(notification);
              const typeConfig = notificationTypeConfig[notification.type] || notificationTypeConfig.info;
              const TypeIcon = typeConfig.icon;
              const priority = priorityConfig[notification.priority] || priorityConfig.normal;

              return (
                <div
                  key={notification._id}
                  className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors ${!read ? 'bg-indigo-50/30' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-xl ${typeConfig.bgColor} shrink-0`}>
                      <TypeIcon className={`h-6 w-6 ${typeConfig.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-base font-semibold text-gray-900 ${!read ? 'font-bold' : ''}`}>
                              {notification.title}
                            </h3>
                            {!read && (
                              <span className="w-2 h-2 bg-indigo-600 rounded-full shrink-0"></span>
                            )}
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priority.color}`}>
                              {priority.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                            <span title={formatFullDate(notification.createdAt)}>
                              {formatTime(notification.createdAt)}
                            </span>
                            <span className={`px-2 py-0.5 rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                              {typeConfig.label}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!read && (
                            <button
                              onClick={() => handleMarkAsRead(notification)}
                              disabled={markAsRead.isPending}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {notifications.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {filteredNotifications.length} of {notifications.length} notifications
        </div>
      )}
    </div>
  );
}


