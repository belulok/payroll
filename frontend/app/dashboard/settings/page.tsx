'use client';

import { useEffect, useState } from 'react';
import feathersClient from '@/lib/feathers';
import { API_URL } from '@/lib/config';
import {
  BellIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  UserPlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  useSystemSettings,
  useSaveSystemSettings,
  useAddRecipient,
  useRemoveRecipient,
  useUpdateRecipient,
  NotificationRecipient,
  SmtpSettings,
  DocumentReminderSettings
} from '@/hooks/useSystemSettings';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  company?: any;
}

type SettingsTab = 'profile' | 'email' | 'reminders' | 'recipients' | 'notifications' | 'security';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // System settings
  const { data: systemSettings, isLoading: settingsLoading, refetch: refetchSettings } = useSystemSettings('main');
  const saveSettings = useSaveSystemSettings();
  const addRecipient = useAddRecipient();
  const removeRecipient = useRemoveRecipient();
  const updateRecipient = useUpdateRecipient();

  // Form states
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  const [smtpForm, setSmtpForm] = useState<SmtpSettings>({
    host: '',
    port: 465,
    secure: true,
    user: '',
    password: '',
    fromEmail: 'nulong.services@gmail.com',
    fromName: 'Payroll System'
  });

  const [reminderForm, setReminderForm] = useState<DocumentReminderSettings>({
    enabled: true,
    reminderDays: [30, 7, 3],
    reminderTime: '09:00',
    inAppNotifications: true,
    emailNotifications: true
  });

  const [newRecipient, setNewRecipient] = useState<Partial<NotificationRecipient>>({
    email: '',
    name: '',
    notificationTypes: ['document-expiry'],
    isActive: true
  });

  const [notifications, setNotifications] = useState({
    email: true,
    timesheetApprovals: true,
    payrollGenerated: true,
    leaveRequests: true
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (systemSettings) {
      console.log('Settings loaded:', systemSettings);
      if (systemSettings.smtp) {
        setSmtpForm({
          host: systemSettings.smtp.host || 'smtp.gmail.com',
          port: systemSettings.smtp.port || 465,
          secure: systemSettings.smtp.secure !== false,
          user: systemSettings.smtp.user || 'nulong.services@gmail.com',
          password: '', // Always empty - user must re-enter to change
          fromEmail: systemSettings.smtp.fromEmail || 'nulong.services@gmail.com',
          fromName: systemSettings.smtp.fromName || 'Payroll System'
        });
      }
      if (systemSettings.documentReminders) {
        setReminderForm({
          enabled: systemSettings.documentReminders.enabled !== false,
          reminderDays: systemSettings.documentReminders.reminderDays || [30, 7, 3],
          reminderTime: systemSettings.documentReminders.reminderTime || '09:00',
          inAppNotifications: systemSettings.documentReminders.inAppNotifications !== false,
          emailNotifications: systemSettings.documentReminders.emailNotifications !== false
        });
      }
      if (systemSettings.notifications) {
        setNotifications(prev => ({
          ...prev,
          ...systemSettings.notifications
        }));
      }
    }
  }, [systemSettings]);

  const fetchUser = async () => {
    try {
      const auth = await feathersClient.reAuthenticate();
      setUser(auth.user);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSmtp = async () => {
    try {
      const smtpData: any = { ...smtpForm };

      // If password is empty, don't update it (keep existing)
      if (!smtpData.password) {
        delete smtpData.password;
      }

      const data: any = {
        key: 'main',
        smtp: smtpData
      };

      // Always pass the ID if we have it
      await saveSettings.mutateAsync({
        id: systemSettings?._id,
        data
      });

      refetchSettings();
      setSmtpForm(prev => ({ ...prev, password: '' })); // Clear password field after save
      alert('SMTP settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving SMTP settings:', error);
      alert('Failed to save SMTP settings: ' + (error.message || 'Unknown error'));
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);

    try {
      const response = await fetch('${API_URL}/email/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp: smtpForm })
      });
      const result = await response.json();
      setSmtpTestResult(result);
    } catch (error: any) {
      setSmtpTestResult({ success: false, message: error.message || 'Connection failed' });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!smtpForm.host || !smtpForm.user || !smtpForm.password) {
      setTestEmailResult({ success: false, message: 'Please fill in all SMTP settings including password' });
      return;
    }

    setSendingTestEmail(true);
    setTestEmailResult(null);

    try {
      const response = await fetch('${API_URL}/email/test-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || smtpForm.fromEmail,
          smtp: smtpForm // Pass the form values directly
        })
      });
      const result = await response.json();
      setTestEmailResult(result);
    } catch (error: any) {
      setTestEmailResult({ success: false, message: error.message || 'Failed to send test email' });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleSaveReminders = async () => {
    try {
      const data = {
        key: 'main',
        documentReminders: reminderForm
      };

      await saveSettings.mutateAsync({
        id: systemSettings?._id,
        data
      });

      refetchSettings();
      alert('Reminder settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving reminder settings:', error);
      alert('Failed to save reminder settings: ' + (error.message || 'Unknown error'));
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.email || !newRecipient.name) {
      alert('Please fill in name and email');
      return;
    }

    try {
      if (systemSettings?._id) {
        await addRecipient.mutateAsync({
          id: systemSettings._id,
          recipient: newRecipient as NotificationRecipient
        });
        setNewRecipient({
          email: '',
          name: '',
          notificationTypes: ['document-expiry'],
          isActive: true
        });
        refetchSettings();
      } else {
        // Create settings first
        const result = await saveSettings.mutateAsync({
          data: {
            key: 'main',
            notificationRecipients: [newRecipient as NotificationRecipient]
          }
        });
        setNewRecipient({
          email: '',
          name: '',
          notificationTypes: ['document-expiry'],
          isActive: true
        });
        refetchSettings();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to add recipient');
    }
  };

  const handleRemoveRecipient = async (email: string) => {
    if (!confirm('Are you sure you want to remove this recipient?')) return;

    try {
      if (systemSettings?._id) {
        await removeRecipient.mutateAsync({ id: systemSettings._id, email });
        refetchSettings();
      }
    } catch (error) {
      alert('Failed to remove recipient');
    }
  };

  const handleToggleRecipient = async (email: string, isActive: boolean) => {
    try {
      if (systemSettings?._id) {
        await updateRecipient.mutateAsync({
          id: systemSettings._id,
          email,
          updates: { isActive }
        });
        refetchSettings();
      }
    } catch (error) {
      alert('Failed to update recipient');
    }
  };

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: UserCircleIcon },
    { id: 'email' as SettingsTab, label: 'Email (SMTP)', icon: EnvelopeIcon },
    { id: 'reminders' as SettingsTab, label: 'Document Reminders', icon: DocumentTextIcon },
    { id: 'recipients' as SettingsTab, label: 'Recipients', icon: UserPlusIcon },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: BellIcon },
    { id: 'security' as SettingsTab, label: 'Security', icon: ShieldCheckIcon },
  ];

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Cog6ToothIcon className="h-8 w-8 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage system configuration, email, and notifications</p>
        </div>
      </div>

      {/* Settings Container */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-lg space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Profile Information</h3>
                <p className="text-sm text-gray-500">Update your personal details and contact information.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={user?.role?.replace('-', ' ')}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 capitalize cursor-not-allowed"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Email (SMTP) Tab */}
          {activeTab === 'email' && (
            <div className="max-w-lg space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Email Configuration (SMTP)</h3>
                <p className="text-sm text-gray-500">Configure SMTP settings for sending notification emails.</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">Email: nulong.services@gmail.com</p>
                    <p className="mt-1">For Gmail, use an App Password instead of your regular password.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host *</label>
                    <input
                      type="text"
                      value={smtpForm.host}
                      onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port *</label>
                    <input
                      type="number"
                      value={smtpForm.port}
                      onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="465"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username *</label>
                  <input
                    type="text"
                    value={smtpForm.user}
                    onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="nulong.services@gmail.com"
                  />
                </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Password *
                  {(systemSettings as any)?.smtp?.hasPassword && (
                    <span className="ml-2 text-xs text-green-600">✓ Password saved</span>
                  )}
                </label>
                <input
                  type="password"
                  value={smtpForm.password}
                  onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={(systemSettings as any)?.smtp?.hasPassword ? "Leave empty to keep existing password" : "Enter your App Password"}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(systemSettings as any)?.smtp?.hasPassword
                    ? "Leave empty to keep the existing password, or enter a new one to change it"
                    : "Enter your Gmail App Password"}
                </p>
              </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                    <input
                      type="email"
                      value={smtpForm.fromEmail}
                      onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="nulong.services@gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                    <input
                      type="text"
                      value={smtpForm.fromName}
                      onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Payroll System"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpForm.secure}
                      onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Use SSL/TLS (recommended for port 465)</span>
                  </label>
                </div>

                {/* Test Results */}
                {smtpTestResult && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    smtpTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {smtpTestResult.success ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <XCircleIcon className="h-5 w-5" />
                    )}
                    <span className="text-sm">{smtpTestResult.message}</span>
                  </div>
                )}

                {testEmailResult && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    testEmailResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {testEmailResult.success ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <XCircleIcon className="h-5 w-5" />
                    )}
                    <span className="text-sm">{testEmailResult.success ? 'Test email sent successfully!' : testEmailResult.message}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={handleTestSmtp}
                    disabled={testingSmtp || !smtpForm.host || !smtpForm.user || !smtpForm.password}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!smtpForm.password ? "Enter password to test connection" : ""}
                  >
                    {testingSmtp ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleSendTestEmail}
                    disabled={sendingTestEmail || !smtpForm.host || !smtpForm.user || !smtpForm.password}
                    className="px-4 py-2 border border-indigo-300 rounded-lg text-indigo-700 hover:bg-indigo-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!smtpForm.password ? "Enter password to send test email" : ""}
                  >
                    {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                  </button>
                  <button
                    onClick={handleSaveSmtp}
                    disabled={saveSettings.isPending || !smtpForm.host || !smtpForm.user || (!(systemSettings as any)?.smtp?.hasPassword && !smtpForm.password)}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    title={(!(systemSettings as any)?.smtp?.hasPassword && !smtpForm.password) ? "Enter password to save" : ""}
                  >
                    {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Document Reminders Tab */}
          {activeTab === 'reminders' && (
            <div className="max-w-lg space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Document Expiry Reminders</h3>
                <p className="text-sm text-gray-500">Configure when and how to send reminders for expiring documents.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderForm.enabled}
                      onChange={(e) => setReminderForm({ ...reminderForm, enabled: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                    />
                    <span className="text-sm font-medium text-gray-900">Enable document expiry reminders</span>
                  </label>
                </div>

                <div className={reminderForm.enabled ? '' : 'opacity-50 pointer-events-none'}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Schedule
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 30, label: '1 Month (30 days)' },
                      { value: 14, label: '2 Weeks (14 days)' },
                      { value: 7, label: '1 Week (7 days)' },
                      { value: 3, label: '3 Days' },
                      { value: 1, label: '1 Day' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reminderForm.reminderDays.includes(option.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReminderForm({
                                ...reminderForm,
                                reminderDays: [...reminderForm.reminderDays, option.value].sort((a, b) => b - a)
                              });
                            } else {
                              setReminderForm({
                                ...reminderForm,
                                reminderDays: reminderForm.reminderDays.filter(d => d !== option.value)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">{option.label} before expiry</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={reminderForm.enabled ? '' : 'opacity-50 pointer-events-none'}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Methods
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reminderForm.emailNotifications}
                        onChange={(e) => setReminderForm({ ...reminderForm, emailNotifications: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">📧 Email notifications</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reminderForm.inAppNotifications}
                        onChange={(e) => setReminderForm({ ...reminderForm, inAppNotifications: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">🔔 In-app notifications</span>
                    </label>
                  </div>
                </div>

                <div className={reminderForm.enabled ? '' : 'opacity-50 pointer-events-none'}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Check Time
                  </label>
                  <input
                    type="time"
                    value={reminderForm.reminderTime}
                    onChange={(e) => setReminderForm({ ...reminderForm, reminderTime: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">System checks for expiring documents at this time daily</p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveReminders}
                    disabled={saveSettings.isPending}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saveSettings.isPending ? 'Saving...' : 'Save Reminder Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recipients Tab */}
          {activeTab === 'recipients' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Notification Recipients</h3>
                <p className="text-sm text-gray-500">Manage who receives email notifications for document expiry and other events.</p>
              </div>

              {/* Add New Recipient */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-800">Add New Recipient</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={newRecipient.name}
                      onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., HR Manager"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={newRecipient.email}
                      onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., hr@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type</label>
                    <select
                      value={newRecipient.notificationTypes?.[0] || 'document-expiry'}
                      onChange={(e) => setNewRecipient({ ...newRecipient, notificationTypes: [e.target.value as any] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="document-expiry">Document Expiry</option>
                      <option value="payroll">Payroll</option>
                      <option value="timesheet">Timesheet</option>
                      <option value="leave">Leave Requests</option>
                      <option value="all">All Notifications</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleAddRecipient}
                  disabled={addRecipient.isPending || !newRecipient.email || !newRecipient.name}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addRecipient.isPending ? 'Adding...' : 'Add Recipient'}
                </button>
              </div>

              {/* Recipients List */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-800">Current Recipients ({systemSettings?.notificationRecipients?.length || 0})</h4>

                {!systemSettings?.notificationRecipients?.length ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <UserPlusIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No recipients added yet</p>
                    <p className="text-xs text-gray-400 mt-1">Add recipients above to receive notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                    {systemSettings.notificationRecipients.map((recipient: NotificationRecipient, index: number) => (
                      <div
                        key={recipient.email}
                        className={`flex items-center justify-between p-4 ${recipient.isActive ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            recipient.isActive ? 'bg-indigo-500' : 'bg-gray-400'
                          }`}>
                            {recipient.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className={`font-medium ${recipient.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                              {recipient.name}
                            </p>
                            <p className="text-sm text-gray-500">{recipient.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-wrap gap-1">
                            {recipient.notificationTypes?.map((type) => (
                              <span
                                key={type}
                                className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full"
                              >
                                {type === 'document-expiry' ? '📄 Docs' :
                                 type === 'payroll' ? '💰 Payroll' :
                                 type === 'timesheet' ? '⏱️ Timesheet' :
                                 type === 'leave' ? '🏖️ Leave' : '🔔 All'}
                              </span>
                            ))}
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={recipient.isActive}
                              onChange={(e) => handleToggleRecipient(recipient.email, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                          <button
                            onClick={() => handleRemoveRecipient(recipient.email)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove recipient"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="max-w-lg space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Notification Preferences</h3>
                <p className="text-sm text-gray-500">Choose what notifications you want to receive.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive general email notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.email}
                      onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Timesheet Approvals</p>
                    <p className="text-xs text-gray-500">Get notified when timesheets need approval</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.timesheetApprovals}
                      onChange={(e) => setNotifications({ ...notifications, timesheetApprovals: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Payroll Generated</p>
                    <p className="text-xs text-gray-500">Get notified when payroll is generated</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.payrollGenerated}
                      onChange={(e) => setNotifications({ ...notifications, payrollGenerated: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Leave Requests</p>
                    <p className="text-xs text-gray-500">Get notified about leave request updates</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.leaveRequests}
                      onChange={(e) => setNotifications({ ...notifications, leaveRequests: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="max-w-lg space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Change Password</h3>
                <p className="text-sm text-gray-500">Update your password to keep your account secure.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                    Update Password
                  </button>
                </div>
              </div>

              {/* Additional Security Options */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Account Security</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                      <p className="text-xs text-gray-500">Add an extra layer of security</p>
                    </div>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Login History</p>
                      <p className="text-xs text-gray-500">View your recent login activity</p>
                    </div>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
