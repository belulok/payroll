'use client';

import { useEffect, useState } from 'react';
import feathersClient from '@/lib/feathers';
import {
  Cog6ToothIcon,
  BuildingOfficeIcon,
  BellIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  company?: any;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure system preferences and account settings</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <UserCircleIcon className="h-6 w-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={`${user?.firstName} ${user?.lastName}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={user?.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={user?.role}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 capitalize"
              />
            </div>
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Update Profile
            </button>
          </div>
        </div>

        {/* Payroll Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <CurrencyDollarIcon className="h-6 w-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Payroll Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="MYR">MYR - Malaysian Ringgit</option>
                <option value="SGD">SGD - Singapore Dollar</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Cycle</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="monthly">Monthly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2 h-4 w-4 text-indigo-600 rounded" />
                <span className="text-sm text-gray-700">Enable EPF Deduction</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2 h-4 w-4 text-indigo-600 rounded" />
                <span className="text-sm text-gray-700">Enable SOCSO Deduction</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2 h-4 w-4 text-indigo-600 rounded" />
                <span className="text-sm text-gray-700">Enable EIS Deduction</span>
              </label>
            </div>
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Save Payroll Settings
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <BellIcon className="h-6 w-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Email Notifications</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-indigo-600 rounded" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Timesheet Approvals</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-indigo-600 rounded" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Payroll Generated</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-indigo-600 rounded" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Leave Requests</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-indigo-600 rounded" />
            </label>
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors mt-4">
              Save Preferences
            </button>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Security</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

