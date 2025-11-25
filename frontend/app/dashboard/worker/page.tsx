'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import feathersClient from '@/lib/feathers';
import {
  UserCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  QrCodeIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function WorkerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [worker, setWorker] = useState<any>(null);
  const [todayTimesheet, setTodayTimesheet] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const auth = await feathersClient.reAuthenticate();
      const currentUser = auth.user;
      setUser(currentUser);

      if (currentUser.role !== 'worker') {
        // Redirect non-workers to main dashboard
        router.push('/dashboard');
        return;
      }

      // Fetch worker data
      if (currentUser.worker) {
        const workerData = await feathersClient.service('workers').get(currentUser.worker);
        setWorker(workerData);

        // Fetch today's timesheet
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const timesheets = await feathersClient.service('timesheets').find({
          query: {
            worker: currentUser.worker,
            'dailyEntries.date': {
              $gte: today.toISOString(),
              $lt: tomorrow.toISOString()
            },
            $limit: 1
          }
        });

        if (timesheets.data && timesheets.data.length > 0) {
          setTodayTimesheet(timesheets.data[0]);
        }

        // Fetch leave balance
        // TODO: Implement leave balance calculation
        setLeaveBalance({
          annual: 14,
          sick: 14,
          used: 3
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const todayEntry = todayTimesheet?.dailyEntries?.find((entry: any) => {
    const entryDate = new Date(entry.date);
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  });

  const isCheckedIn = todayEntry && todayEntry.clockIn && !todayEntry.clockOut;
  const isCheckedOut = todayEntry && todayEntry.clockOut;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {worker?.firstName} {worker?.lastName}
        </h1>
        <p className="text-gray-600 mt-1">Employee ID: {worker?.employeeId}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Check In/Out Card */}
        <div className="bg-white rounded-lg shadow p-6 border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Attendance</h3>
            <ClockIcon className="h-8 w-8 text-indigo-600" />
          </div>

          {isCheckedOut ? (
            <div className="text-center py-4">
              <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="text-green-600 font-semibold">Checked Out</p>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(todayEntry.clockOut).toLocaleTimeString()}
              </p>
            </div>
          ) : isCheckedIn ? (
            <div className="text-center py-4">
              <CheckCircleIcon className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <p className="text-blue-600 font-semibold">Checked In</p>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(todayEntry.clockIn).toLocaleTimeString()}
              </p>
              <button className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Check Out
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <XCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 font-semibold">Not Checked In</p>
              <button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Check In
              </button>
            </div>
          )}
        </div>

        {/* Leave Balance Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Leave Balance</h3>
            <CalendarDaysIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Annual Leave</span>
              <span className="text-2xl font-bold text-gray-900">{leaveBalance?.annual || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sick Leave</span>
              <span className="text-2xl font-bold text-gray-900">{leaveBalance?.sick || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-gray-600">Used This Year</span>
              <span className="text-lg font-semibold text-red-600">{leaveBalance?.used || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">This Month</h3>
            <DocumentTextIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Days Worked</span>
              <span className="text-2xl font-bold text-gray-900">22</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Hours Worked</span>
              <span className="text-2xl font-bold text-gray-900">176</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-gray-600">Late Arrivals</span>
              <span className="text-lg font-semibold text-yellow-600">2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Menu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* My Profile */}
        <button
          onClick={() => router.push('/dashboard/worker/profile')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
        >
          <UserCircleIcon className="h-12 w-12 text-indigo-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">My Profile</h3>
          <p className="text-gray-600">View and update your personal information</p>
        </button>

        {/* My Timesheets */}
        <button
          onClick={() => router.push('/dashboard/worker/timesheets')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
        >
          <ClockIcon className="h-12 w-12 text-blue-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">My Timesheets</h3>
          <p className="text-gray-600">View your attendance and work hours</p>
        </button>

        {/* My Payslips */}
        <button
          onClick={() => router.push('/dashboard/worker/payslips')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
        >
          <DocumentTextIcon className="h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">My Payslips</h3>
          <p className="text-gray-600">View and download your payslips</p>
        </button>

        {/* Leave Requests */}
        <button
          onClick={() => router.push('/dashboard/worker/leave')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
        >
          <CalendarDaysIcon className="h-12 w-12 text-purple-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Leave Requests</h3>
          <p className="text-gray-600">Submit and track your leave requests</p>
        </button>

        {/* QR Check-In */}
        <button
          onClick={() => router.push('/dashboard/worker/checkin')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
        >
          <QrCodeIcon className="h-12 w-12 text-orange-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">QR Check-In</h3>
          <p className="text-gray-600">Scan QR code to check in/out</p>
        </button>

        {/* Logout */}
        <button
          onClick={async () => {
            await feathersClient.logout();
            router.push('/login');
          }}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left border-2 border-red-200"
        >
          <ArrowRightOnRectangleIcon className="h-12 w-12 text-red-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Logout</h3>
          <p className="text-gray-600">Sign out of your account</p>
        </button>
      </div>
    </div>
  );
}
