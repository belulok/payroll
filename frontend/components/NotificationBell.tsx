'use client';

import Link from 'next/link';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { useUnreadCount } from '@/hooks/useNotifications';

export default function NotificationBell() {
  const { data: unreadCount = 0 } = useUnreadCount();

  return (
    <Link
      href="/dashboard/notifications"
      className="relative p-2 rounded-lg hover:bg-indigo-700 transition-colors"
      aria-label="Notifications"
      title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
    >
      {unreadCount > 0 ? (
        <BellAlertIcon className="h-6 w-6 text-white" />
      ) : (
        <BellIcon className="h-6 w-6 text-white" />
      )}

      {/* Badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
