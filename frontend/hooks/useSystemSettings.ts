import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

export interface DocumentReminderSettings {
  enabled: boolean;
  reminderDays: number[];
  reminderTime: string;
  inAppNotifications: boolean;
  emailNotifications: boolean;
}

export interface NotificationRecipient {
  email: string;
  name: string;
  notificationTypes: ('document-expiry' | 'payroll' | 'timesheet' | 'leave' | 'all')[];
  isActive: boolean;
}

export interface SystemSettings {
  _id: string;
  key: string;
  company?: string | null;
  smtp: SmtpSettings;
  documentReminders: DocumentReminderSettings;
  notificationRecipients: NotificationRecipient[];
  notifications: {
    timesheetReminders: boolean;
    payrollGenerated: boolean;
    leaveRequests: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Get system settings
export function useSystemSettings(key: string = 'main', companyId?: string | null) {
  return useQuery({
    queryKey: ['system-settings', key, companyId],
    queryFn: async () => {
      try {
        // Try to get settings by key - don't filter by company for global settings
        const result = await feathersClient.service('system-settings').find({
          query: {
            key,
            $limit: 1
          }
        });

        const settings = result.data?.[0] || result[0];
        if (settings) {
          console.log('Loaded settings:', settings._id);
          return settings;
        }

        // If no settings exist, return default structure (without _id to indicate it's new)
        console.log('No settings found, returning defaults');
        return {
          key,
          company: companyId || null,
          smtp: {
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            user: 'nulong.services@gmail.com',
            password: '',
            fromEmail: 'nulong.services@gmail.com',
            fromName: 'Payroll System'
          },
          documentReminders: {
            enabled: true,
            reminderDays: [30, 7, 3],
            reminderTime: '09:00',
            inAppNotifications: true,
            emailNotifications: true
          },
          notificationRecipients: [],
          notifications: {
            timesheetReminders: true,
            payrollGenerated: true,
            leaveRequests: true
          }
        };
      } catch (error) {
        console.error('Error fetching settings:', error);
        throw error;
      }
    }
  });
}

// Create or update system settings
export function useSaveSystemSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<SystemSettings> }) => {
      // If we have an ID, use patch
      if (id) {
        console.log('Patching settings:', id);
        return feathersClient.service('system-settings').patch(id, data);
      }

      // Check if settings already exist by key
      const existing = await feathersClient.service('system-settings').find({
        query: { key: data.key || 'main', $limit: 1 }
      });

      const existingSettings = existing.data?.[0] || existing[0];

      if (existingSettings?._id) {
        // Settings exist, patch instead of create
        console.log('Found existing settings, patching:', existingSettings._id);
        return feathersClient.service('system-settings').patch(existingSettings._id, data);
      }

      // No existing settings, create new
      console.log('Creating new settings');
      return feathersClient.service('system-settings').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    }
  });
}

// Update SMTP settings
export function useUpdateSmtpSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, smtp }: { id: string; smtp: Partial<SmtpSettings> }) => {
      return feathersClient.service('system-settings').patch(id, { smtp });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    }
  });
}

// Update document reminder settings
export function useUpdateDocumentReminders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, documentReminders }: { id: string; documentReminders: Partial<DocumentReminderSettings> }) => {
      return feathersClient.service('system-settings').patch(id, { documentReminders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    }
  });
}

// Add notification recipient
export function useAddRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, recipient }: { id: string; recipient: NotificationRecipient }) => {
      const settings = await feathersClient.service('system-settings').get(id);
      const recipients = [...(settings.notificationRecipients || []), recipient];
      return feathersClient.service('system-settings').patch(id, { notificationRecipients: recipients });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    }
  });
}

// Remove notification recipient
export function useRemoveRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, email }: { id: string; email: string }) => {
      const settings = await feathersClient.service('system-settings').get(id);
      const recipients = (settings.notificationRecipients || []).filter(
        (r: NotificationRecipient) => r.email !== email
      );
      return feathersClient.service('system-settings').patch(id, { notificationRecipients: recipients });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    }
  });
}

// Update recipient
export function useUpdateRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, email, updates }: { id: string; email: string; updates: Partial<NotificationRecipient> }) => {
      const settings = await feathersClient.service('system-settings').get(id);
      const recipients = (settings.notificationRecipients || []).map((r: NotificationRecipient) =>
        r.email === email ? { ...r, ...updates } : r
      );
      return feathersClient.service('system-settings').patch(id, { notificationRecipients: recipients });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    }
  });
}

// Test SMTP connection
export function useTestSmtpConnection() {
  return useMutation({
    mutationFn: async (smtp: SmtpSettings) => {
      const response = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp })
      });
      return response.json();
    }
  });
}

// Send test email
export function useSendTestEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch('/api/email/test-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return response.json();
    }
  });
}

