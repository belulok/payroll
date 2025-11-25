'use client';

import { useEffect, useState } from 'react';
import feathersClient from '@/lib/feathers';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  XMarkIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

interface DailyEntry {
  date: string;
  dayOfWeek: string;
  clockIn?: string;
  clockOut?: string;
  normalHours: number;
  ot1_5Hours: number;
  ot2_0Hours: number;
  totalHours: number;
  checkInMethod?: string;
  qrCodeCheckIn?: {
    scanned: boolean;
    scannedAt: string;
  };
  qrCodeCheckOut?: {
    scanned: boolean;
    scannedAt: string;
  };
  location?: {
    clockIn?: {
      latitude: number;
      longitude: number;
      address: string;
      timestamp: string;
    };
    clockOut?: {
      latitude: number;
      longitude: number;
      address: string;
      timestamp: string;
    };
  };
  notes?: string;
  isAbsent: boolean;
}

interface WeeklyTimesheet {
  _id: string;
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
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

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  approved_subcon: { label: 'Approved (Subcon)', color: 'bg-yellow-100 text-yellow-800' },
  approved_admin: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' }
};

// Helper function to get Monday of the week
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

// Helper function to get day name
function getDayName(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
}

// Helper function to format time
function formatTime(timeString: string): string {
  if (!timeString) return '';
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function TimesheetsPage() {
  const [weeklyTimesheets, setWeeklyTimesheets] = useState<WeeklyTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));

  useEffect(() => {
    fetchTimesheets();
  }, [currentWeekStart]);

  const fetchTimesheets = async () => {
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 4);

      const response = await feathersClient.service('timesheets').find({
        query: {
          $limit: 500,
          weekStartDate: {
            $gte: currentWeekStart.toISOString(),
            $lte: weekEnd.toISOString()
          },
          $sort: { weekStartDate: 1 },
          isDeleted: false
        }
      });

      const fetchedTimesheets = response.data || response;
      setWeeklyTimesheets(fetchedTimesheets);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const [selectedWeeklyTimesheet, setSelectedWeeklyTimesheet] = useState<WeeklyTimesheet | null>(null);

  const handleViewWorkerWeek = (weeklyTimesheet: WeeklyTimesheet) => {
    setSelectedWeeklyTimesheet(weeklyTimesheet);
    setShowModal(true);
  };

  const handlePreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleCurrentWeek = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  const handleGeneratePDF = (timesheet: WeeklyTimesheet) => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('feathers-jwt');

    if (!token) {
      alert('Please log in to generate PDF');
      return;
    }

    // Open PDF in new tab with token in URL
    const pdfUrl = `/api/timesheets/${timesheet._id}/pdf?token=${encodeURIComponent(token)}`;
    window.open(pdfUrl, '_blank');
  };

  const pendingCount = weeklyTimesheets.filter(t => t.status === 'submitted').length;
  const approvedCount = weeklyTimesheets.filter(t => t.status === 'approved_admin').length;
  const totalHours = weeklyTimesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);

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
        <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
        <p className="text-gray-600 mt-2">Weekly timesheet view with billing details</p>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
        <button
          onClick={handlePreviousWeek}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
        >
          ← Previous Week
        </button>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {currentWeekStart.toLocaleDateString('en-MY', { month: 'long', day: 'numeric', year: 'numeric' })}
            {' - '}
            {new Date(currentWeekStart.getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-MY', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <button
            onClick={handleCurrentWeek}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-1"
          >
            Go to Current Week
          </button>
        </div>
        <button
          onClick={handleNextWeek}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
        >
          Next Week →
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Workers</p>
              <p className="text-2xl font-bold text-gray-900">{weeklyTimesheets.length}</p>
            </div>
            <ClipboardDocumentCheckIcon className="h-10 w-10 text-gray-400" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Pending</p>
              <p className="text-2xl font-bold text-blue-900">{pendingCount}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-blue-400" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Approved</p>
              <p className="text-2xl font-bold text-green-900">{approvedCount}</p>
            </div>
            <CheckCircleIcon className="h-10 w-10 text-green-400" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">Total Hours</p>
              <p className="text-2xl font-bold text-purple-900">{totalHours.toFixed(1)}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-purple-400" />
          </div>
        </div>
      </div>



      {/* Timesheets List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Worker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Week
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status Summary
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {weeklyTimesheets.map((weeklyTimesheet) => {
              const totalDays = weeklyTimesheet.dailyEntries.filter(d => !d.isAbsent).length;

              return (
                <tr key={weeklyTimesheet._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="shrink-0 h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-bold text-lg">
                          {weeklyTimesheet.worker?.firstName?.[0]}{weeklyTimesheet.worker?.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-base font-semibold text-gray-900">
                          {weeklyTimesheet.worker?.firstName} {weeklyTimesheet.worker?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{weeklyTimesheet.worker?.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(weeklyTimesheet.weekStartDate).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
                      {' - '}
                      {new Date(weeklyTimesheet.weekEndDate).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-gray-500">{totalDays} days logged</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-base font-bold text-gray-900">{weeklyTimesheet.totalHours.toFixed(1)}h</div>
                    <div className="text-xs text-gray-500">Normal: {weeklyTimesheet.totalNormalHours.toFixed(1)}h</div>
                    {weeklyTimesheet.totalOT1_5Hours > 0 && (
                      <div className="text-xs text-yellow-600">OT 1.5x: {weeklyTimesheet.totalOT1_5Hours.toFixed(1)}h</div>
                    )}
                    {weeklyTimesheet.totalOT2_0Hours > 0 && (
                      <div className="text-xs text-orange-600">OT 2.0x: {weeklyTimesheet.totalOT2_0Hours.toFixed(1)}h</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[weeklyTimesheet.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {statusConfig[weeklyTimesheet.status as keyof typeof statusConfig]?.label || weeklyTimesheet.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewWorkerWeek(weeklyTimesheet)}
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-medium ml-auto"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View Week
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {weeklyTimesheets.length === 0 && (
          <div className="text-center py-12">
            <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No timesheets found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No timesheets for this week.
            </p>
          </div>
        )}
      </div>

      {/* View Worker Week Modal */}
      {showModal && selectedWeeklyTimesheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Weekly Timesheet</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedWeeklyTimesheet.worker?.firstName} {selectedWeeklyTimesheet.worker?.lastName} - {selectedWeeklyTimesheet.worker?.employeeId}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleGeneratePDF(selectedWeeklyTimesheet)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  PDF
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Worker Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedWeeklyTimesheet.totalHours.toFixed(1)}h</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 mb-1">Normal Hours</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedWeeklyTimesheet.totalNormalHours.toFixed(1)}h</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600 mb-1">OT 1.5x Hours</p>
                  <p className="text-2xl font-bold text-yellow-900">{selectedWeeklyTimesheet.totalOT1_5Hours.toFixed(1)}h</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600 mb-1">OT 2.0x Hours</p>
                  <p className="text-2xl font-bold text-orange-900">{selectedWeeklyTimesheet.totalOT2_0Hours.toFixed(1)}h</p>
                </div>
              </div>

              {/* Weekly Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Day
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clock In/Out
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        QR Timestamps
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours Breakdown
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedWeeklyTimesheet.dailyEntries.map((dayEntry) => {
                      if (dayEntry.isAbsent) {
                        return (
                          <tr key={dayEntry.dayOfWeek} className="bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap font-semibold text-gray-900">{dayEntry.dayOfWeek}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(dayEntry.date)}
                            </td>
                            <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-400">
                              Absent
                            </td>
                          </tr>
                        );
                      }

                      const dayTotal = (dayEntry.normalHours || 0) + (dayEntry.ot1_5Hours || 0) + (dayEntry.ot2_0Hours || 0);

                      return (
                        <tr key={dayEntry.dayOfWeek} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap font-semibold text-gray-900">{dayEntry.dayOfWeek}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(dayEntry.date)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div className="font-semibold">In: {dayEntry.clockIn ? formatTime(dayEntry.clockIn) : '-'}</div>
                              <div className="font-semibold">Out: {dayEntry.clockOut ? formatTime(dayEntry.clockOut) : '-'}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {dayEntry.qrCodeCheckIn?.scanned ? (
                              <div className="text-sm">
                                <div className="text-green-600 font-semibold">
                                  ✓ In: {formatTime(dayEntry.qrCodeCheckIn.scannedAt)}
                                </div>
                                {dayEntry.qrCodeCheckOut?.scanned && (
                                  <div className="text-green-600 font-semibold">
                                    ✓ Out: {formatTime(dayEntry.qrCodeCheckOut.scannedAt)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Manual entry</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="text-gray-900">Normal: <span className="font-semibold">{dayEntry.normalHours.toFixed(1)}h</span></div>
                              {dayEntry.ot1_5Hours > 0 && (
                                <div className="text-yellow-600">OT 1.5x: <span className="font-semibold">{dayEntry.ot1_5Hours.toFixed(1)}h</span></div>
                              )}
                              {dayEntry.ot2_0Hours > 0 && (
                                <div className="text-orange-600">OT 2.0x: <span className="font-semibold">{dayEntry.ot2_0Hours.toFixed(1)}h</span></div>
                              )}
                              <div className="text-gray-900 font-bold mt-1">Total: {dayTotal.toFixed(1)}h</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${statusConfig[selectedWeeklyTimesheet.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}`}>
                              {statusConfig[selectedWeeklyTimesheet.status as keyof typeof statusConfig]?.label || selectedWeeklyTimesheet.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-right font-bold text-gray-900">
                        Week Total:
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold">
                          <div className="text-gray-900">Normal: {selectedWeeklyTimesheet.totalNormalHours.toFixed(1)}h</div>
                          {selectedWeeklyTimesheet.totalOT1_5Hours > 0 && (
                            <div className="text-yellow-600">OT 1.5x: {selectedWeeklyTimesheet.totalOT1_5Hours.toFixed(1)}h</div>
                          )}
                          {selectedWeeklyTimesheet.totalOT2_0Hours > 0 && (
                            <div className="text-orange-600">OT 2.0x: {selectedWeeklyTimesheet.totalOT2_0Hours.toFixed(1)}h</div>
                          )}
                          <div className="text-indigo-900 text-lg mt-1">Total: {selectedWeeklyTimesheet.totalHours.toFixed(1)}h</div>
                        </div>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

