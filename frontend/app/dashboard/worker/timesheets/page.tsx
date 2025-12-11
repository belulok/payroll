'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import feathersClient from '@/lib/feathers';
import { API_URL } from '@/lib/config';
import {
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  EyeIcon,
  XMarkIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

interface DailyEntry {
  date: string;
  dayOfWeek: string;
  clockIn?: string;
  clockOut?: string;
  lunchOut?: string;
  lunchIn?: string;
  normalHours: number;
  ot1_5Hours: number;
  ot2_0Hours: number;
  totalHours: number;
  checkInMethod?: string;
  notes?: string;
  isAbsent: boolean;
  leaveType?: string;
}

interface WeeklyTimesheet {
  _id: string;
  company: {
    _id: string;
    name: string;
  };
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: string;
    position?: string;
  };
  weekStartDate: string;
  weekEndDate: string;
  dailyEntries: DailyEntry[];
  totalNormalHours: number;
  totalOT1_5Hours: number;
  totalOT2_0Hours: number;
  totalHours: number;
  status: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  verified: { label: 'Verified', color: 'bg-green-100 text-green-800' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' }
};

// Helper functions
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
}

function formatTime(timeString: string): string {
  if (!timeString) return '-';
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export default function WorkerTimesheetsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [worker, setWorker] = useState<any>(null);
  const [timesheets, setTimesheets] = useState<WeeklyTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimesheet, setSelectedTimesheet] = useState<WeeklyTimesheet | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTimesheets();
  }, []);

  const fetchTimesheets = async () => {
    try {
      const auth = await feathersClient.reAuthenticate();
      const currentUser = auth.user;
      setUser(currentUser);

      if (currentUser.role !== 'worker') {
        router.push('/dashboard');
        return;
      }

      // Fetch worker details
      const workerData = await feathersClient.service('workers').get(currentUser.worker);
      setWorker(workerData);

      // Fetch all timesheets for the worker (no month filter)
      const response = await feathersClient.service('timesheets').find({
        query: {
          worker: currentUser.worker,
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

  const calculateTotalHours = (timesheet: WeeklyTimesheet): number => {
    return timesheet.dailyEntries?.reduce((total, entry) => {
      if (entry.clockIn && entry.clockOut) {
        // Parse the entry date as base for normalization
        const baseDate = entry.date ? new Date(entry.date) : new Date();

        const clockInRaw = new Date(entry.clockIn);
        const clockOutRaw = new Date(entry.clockOut);

        if (isNaN(clockInRaw.getTime()) || isNaN(clockOutRaw.getTime())) {
          return total;
        }

        // Normalize all times to the same base date to fix date mismatch issues
        const clockIn = new Date(baseDate);
        clockIn.setHours(clockInRaw.getHours(), clockInRaw.getMinutes(), clockInRaw.getSeconds(), 0);

        const clockOut = new Date(baseDate);
        clockOut.setHours(clockOutRaw.getHours(), clockOutRaw.getMinutes(), clockOutRaw.getSeconds(), 0);

        let minutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);

        // Subtract lunch break if present
        if (entry.lunchOut && entry.lunchIn) {
          const lunchOutRaw = new Date(entry.lunchOut);
          const lunchInRaw = new Date(entry.lunchIn);

          if (!isNaN(lunchOutRaw.getTime()) && !isNaN(lunchInRaw.getTime())) {
            const lunchOut = new Date(baseDate);
            lunchOut.setHours(lunchOutRaw.getHours(), lunchOutRaw.getMinutes(), lunchOutRaw.getSeconds(), 0);

            const lunchIn = new Date(baseDate);
            lunchIn.setHours(lunchInRaw.getHours(), lunchInRaw.getMinutes(), lunchInRaw.getSeconds(), 0);

            minutes -= (lunchIn.getTime() - lunchOut.getTime()) / (1000 * 60);
          }
        }

        return total + Math.max(0, minutes / 60);
      }
      return total;
    }, 0) || 0;
  };

  const getDaysWorked = (timesheet: WeeklyTimesheet): number => {
    return timesheet.dailyEntries?.filter(entry => entry.clockIn && entry.clockOut).length || 0;
  };

  // Helper function to parse time values
  const parseTimeValue = (value: string | undefined): Date | null => {
    if (!value) return null;

    // Try parsing directly
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;

    return null;
  };

  // Normalize a time to a specific base date (keeps hours/minutes, changes date)
  const normalizeToDate = (time: Date, baseDate: Date): Date => {
    const normalized = new Date(baseDate);
    normalized.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
    return normalized;
  };

  const handleViewTimesheet = (timesheet: WeeklyTimesheet) => {
    // Clone and calculate hours for display
    const clonedTimesheet = JSON.parse(JSON.stringify(timesheet));

    // Auto-calculate hours for all entries that have clock times
    clonedTimesheet.dailyEntries = clonedTimesheet.dailyEntries.map((entry: DailyEntry) => {
      if (entry.clockIn && entry.clockOut) {
        // Parse the entry date as base
        const baseDate = entry.date ? new Date(entry.date) : new Date();

        const clockInRaw = parseTimeValue(entry.clockIn);
        const clockOutRaw = parseTimeValue(entry.clockOut);

        if (!clockInRaw || !clockOutRaw) {
          return entry;
        }

        // Normalize all times to the same base date to fix date mismatch issues
        const clockIn = normalizeToDate(clockInRaw, baseDate);
        const clockOut = normalizeToDate(clockOutRaw, baseDate);

        let totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);

        // Subtract lunch break if present
        if (entry.lunchOut && entry.lunchIn) {
          const lunchOutRaw = parseTimeValue(entry.lunchOut);
          const lunchInRaw = parseTimeValue(entry.lunchIn);
          if (lunchOutRaw && lunchInRaw) {
            const lunchOut = normalizeToDate(lunchOutRaw, baseDate);
            const lunchIn = normalizeToDate(lunchInRaw, baseDate);
            totalMinutes -= (lunchIn.getTime() - lunchOut.getTime()) / (1000 * 60);
          }
        }

        const totalHours = Math.max(0, totalMinutes / 60);
        const normalHours = Math.min(8, totalHours);
        const ot1_5Hours = totalHours > 8 ? Math.min(2, totalHours - 8) : 0;
        const ot2_0Hours = totalHours > 10 ? totalHours - 10 : 0;

        return {
          ...entry,
          normalHours,
          ot1_5Hours,
          ot2_0Hours,
          totalHours
        };
      }
      return entry;
    });

    setSelectedTimesheet(clonedTimesheet);
    setShowModal(true);
  };

  const handleGeneratePDF = (timesheet: WeeklyTimesheet) => {
    const token = localStorage.getItem('feathers-jwt');
    if (!token) {
      alert('Please log in to generate PDF');
      return;
    }

    const pdfUrl = `${API_URL}/timesheets/${timesheet._id}/pdf?token=${encodeURIComponent(token)}`;
    window.open(pdfUrl, '_blank');
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Total Timesheets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{timesheets.length}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-100 p-4">
          <p className="text-xs text-blue-600 font-medium">Draft</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {timesheets.filter(t => t.status === 'draft').length}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm border border-green-100 p-4">
          <p className="text-xs text-green-600 font-medium">Verified</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {timesheets.filter(t => t.status === 'verified' || t.status === 'approved').length}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg shadow-sm border border-purple-100 p-4">
          <p className="text-xs text-purple-600 font-medium">Total Hours (All Time)</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">
            {timesheets.reduce((sum, t) => sum + calculateTotalHours(t), 0).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Timesheets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Week
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days Worked
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {timesheets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Timesheets Found</h3>
                  <p className="text-gray-500">Your timesheets will appear here once created</p>
                </td>
              </tr>
            ) : (
              timesheets.map((timesheet) => {
                const totalHours = calculateTotalHours(timesheet);
                const daysWorked = getDaysWorked(timesheet);
                const status = statusConfig[timesheet.status] || statusConfig.draft;

                return (
                  <tr key={timesheet._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Week of {new Date(timesheet.weekStartDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatWeekRange(timesheet.weekStartDate, timesheet.weekEndDate)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{daysWorked} / 7 days</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{totalHours.toFixed(2)} hrs</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleViewTimesheet(timesheet)}
                        className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showModal && selectedTimesheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-white">Weekly Time Sheet</h2>
                <p className="text-sm text-indigo-100 mt-0.5">
                  {worker?.firstName} {worker?.lastName} - {worker?.employeeId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGeneratePDF(selectedTimesheet)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 rounded-lg text-sm hover:bg-indigo-50 font-medium transition-colors"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  PDF
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:text-indigo-200 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Company Info */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {typeof selectedTimesheet.company === 'object' ? selectedTimesheet.company.name : '-'}
                </h3>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="flex">
                  <span className="text-gray-500 w-32">Employee Name:</span>
                  <span className="font-medium text-gray-900">{worker?.firstName} {worker?.lastName}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 w-32">EmpID:</span>
                  <span className="font-medium text-gray-900">{worker?.employeeId}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 w-32">Department:</span>
                  <span className="font-medium text-gray-900">{worker?.department || '-'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-500 w-32">Position:</span>
                  <span className="font-medium text-gray-900">{worker?.position || '-'}</span>
                </div>
              </div>

              {/* Timesheet Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-indigo-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">DAY</th>
                      <th className="px-3 py-2 text-left font-medium">DATE</th>
                      <th className="px-3 py-2 text-center font-medium">START</th>
                      <th className="px-3 py-2 text-center font-medium">LUNCH OUT</th>
                      <th className="px-3 py-2 text-center font-medium">LUNCH IN</th>
                      <th className="px-3 py-2 text-center font-medium">END</th>
                      <th className="px-3 py-2 text-center font-medium">REGULAR</th>
                      <th className="px-3 py-2 text-center font-medium">OT</th>
                      <th className="px-3 py-2 text-center font-medium">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTimesheet.dailyEntries?.map((entry, index) => {
                      const isLeave = entry.leaveType && entry.leaveType !== '';
                      const date = new Date(entry.date);
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                      // Calculate hours for this day
                      let regularHours = 0;
                      if (entry.clockIn && entry.clockOut) {
                        const clockIn = new Date(entry.clockIn);
                        const clockOut = new Date(entry.clockOut);
                        regularHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

                        if (entry.lunchOut && entry.lunchIn) {
                          const lunchOut = new Date(entry.lunchOut);
                          const lunchIn = new Date(entry.lunchIn);
                          regularHours -= (lunchIn.getTime() - lunchOut.getTime()) / (1000 * 60 * 60);
                        }
                      }

                      return (
                        <tr key={index} className={`border-b border-gray-100 ${isLeave ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-3 py-2 font-medium text-gray-900">{dayName}</td>
                          <td className="px-3 py-2 text-gray-700">{formatDate(entry.date)}</td>
                          {isLeave ? (
                            <td colSpan={4} className="px-3 py-2 text-center text-yellow-700 font-medium">
                              {entry.leaveType === 'MC' ? '🏥 Medical Leave' :
                               entry.leaveType === 'AL' ? '🏖️ Annual Leave' :
                               entry.leaveType === 'PH' ? '🎉 Public Holiday' :
                               `📋 ${entry.leaveType}`}
                            </td>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-center text-gray-700">{formatTime(entry.clockIn || '')}</td>
                              <td className="px-3 py-2 text-center text-gray-700">{formatTime(entry.lunchOut || '')}</td>
                              <td className="px-3 py-2 text-center text-gray-700">{formatTime(entry.lunchIn || '')}</td>
                              <td className="px-3 py-2 text-center text-gray-700">{formatTime(entry.clockOut || '')}</td>
                            </>
                          )}
                          <td className="px-3 py-2 text-center text-gray-900">{regularHours > 0 ? regularHours.toFixed(1) : '0.0'}</td>
                          <td className="px-3 py-2 text-center text-orange-600">-</td>
                          <td className="px-3 py-2 text-center font-medium text-gray-900">{regularHours > 0 ? regularHours.toFixed(1) : '0.0'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-indigo-50">
                    <tr className="font-medium">
                      <td colSpan={6} className="px-3 py-3 text-right text-gray-700">TOTAL HOURS WORKED</td>
                      <td className="px-3 py-3 text-center text-gray-900">{calculateTotalHours(selectedTimesheet).toFixed(1)}</td>
                      <td className="px-3 py-3 text-center text-orange-600">0.0</td>
                      <td className="px-3 py-3 text-center font-bold text-indigo-600">{calculateTotalHours(selectedTimesheet).toFixed(1)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer Info */}
              <div className="flex items-center justify-between mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[selectedTimesheet.status]?.color || statusConfig.draft.color}`}>
                    {statusConfig[selectedTimesheet.status]?.label || 'Draft'}
                  </span>
                </div>
                <div className="text-gray-500">
                  Week: {formatWeekRange(selectedTimesheet.weekStartDate, selectedTimesheet.weekEndDate)}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
