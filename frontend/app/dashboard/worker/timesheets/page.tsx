'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import feathersClient from '@/lib/feathers';
import {
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

export default function WorkerTimesheetsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    fetchTimesheets();
  }, [selectedMonth]);

  const fetchTimesheets = async () => {
    try {
      const auth = await feathersClient.reAuthenticate();
      const currentUser = auth.user;
      setUser(currentUser);

      if (currentUser.role !== 'worker') {
        router.push('/dashboard');
        return;
      }

      // Get start and end of selected month
      const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

      // Fetch timesheets for the worker
      const response = await feathersClient.service('timesheets').find({
        query: {
          worker: currentUser.worker,
          'dailyEntries.date': {
            $gte: startOfMonth.toISOString(),
            $lte: endOfMonth.toISOString()
          },
          $limit: 100,
          $sort: {
            weekStartDate: -1
          }
        }
      });

      setTimesheets(response.data || response);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const calculateTotalHours = (timesheet: any) => {
    let total = 0;
    timesheet.dailyEntries?.forEach((entry: any) => {
      if (entry.clockIn && entry.clockOut) {
        const clockIn = new Date(entry.clockIn);
        const clockOut = new Date(entry.clockOut);
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        total += hours;
      }
    });
    return total.toFixed(2);
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return badges[status] || badges.draft;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/worker')}
          className="flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ClockIcon className="h-8 w-8 text-indigo-600" />
          My Timesheets
        </h1>
        <p className="text-gray-600 mt-1">View your attendance and work hours</p>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </div>



      {/* Timesheets List */}
      {timesheets.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ClockIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Timesheets Found</h3>
          <p className="text-gray-600">No attendance records for this month</p>
        </div>
      ) : (
        <div className="space-y-6">
          {timesheets.map((timesheet) => (
            <div key={timesheet._id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Timesheet Header */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Week of {new Date(timesheet.weekStartDate).toLocaleDateString()}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(timesheet.weekStartDate).toLocaleDateString()} - {new Date(timesheet.weekEndDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(timesheet.status)}`}>
                      {timesheet.status?.toUpperCase() || 'DRAFT'}
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      Total: {calculateTotalHours(timesheet)} hours
                    </p>
                  </div>
                </div>
              </div>

              {/* Daily Entries */}
              <div className="p-6">
                <div className="space-y-3">
                  {timesheet.dailyEntries?.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {entry.clockIn && entry.clockOut ? (
                              <>
                                {new Date(entry.clockIn).toLocaleTimeString()} - {new Date(entry.clockOut).toLocaleTimeString()}
                              </>
                            ) : entry.clockIn ? (
                              <>Checked in at {new Date(entry.clockIn).toLocaleTimeString()}</>
                            ) : entry.isAbsent ? (
                              'Absent'
                            ) : (
                              'No record'
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {entry.isAbsent ? (
                          <div className="flex items-center text-red-600">
                            <XCircleIcon className="h-5 w-5 mr-1" />
                            <span className="font-medium">Absent</span>
                          </div>
                        ) : entry.clockIn && entry.clockOut ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircleIcon className="h-5 w-5 mr-1" />
                            <span className="font-medium">
                              {((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)).toFixed(2)} hrs
                            </span>
                          </div>
                        ) : entry.clockIn ? (
                          <div className="flex items-center text-blue-600">
                            <ClockIcon className="h-5 w-5 mr-1" />
                            <span className="font-medium">In Progress</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
