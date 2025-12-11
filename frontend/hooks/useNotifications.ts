import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';
import { useState, useEffect } from 'react';

export interface Notification {
  _id: string;
  company: string;
  user?: string | null;
  type: 'document_expiry' | 'timesheet_reminder' | 'timesheet_approved' | 'timesheet_rejected' |
        'payroll_generated' | 'leave_request' | 'leave_approved' | 'leave_rejected' | 'system' | 'info';
  title: string;
  message: string;
  relatedEntity?: {
    type: 'worker' | 'timesheet' | 'payroll' | 'leave' | 'document' | 'invoice';
    id: string;
  };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
  emailSent: boolean;
  emailSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Hook to check if user is authenticated
function useIsAuthenticated() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await feathersClient.reAuthenticate();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  return isAuthenticated;
}

// Fetch notifications
export function useNotifications(limit: number = 20) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: ['notifications', limit],
    queryFn: async () => {
      const result = await feathersClient.service('notifications').find({
        query: {
          $limit: limit,
          $sort: { createdAt: -1 }
        }
      });
      return result.data || result;
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 30000 : false,
  });
}

// Fetch unread count
export function useUnreadCount() {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      try {
        const result = await feathersClient.service('notifications').get('unread-count');
        return result.count || 0;
      } catch (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 30000 : false,
    retry: false,
  });
}

// Mark notification as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      return feathersClient.service('notifications').patch(notificationId, { action: 'markAsRead' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

// Mark all as read
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return feathersClient.service('notifications').create({ action: 'markAllAsRead' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

// Create notification (for testing/manual creation)
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Notification>) => {
      return feathersClient.service('notifications').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}
