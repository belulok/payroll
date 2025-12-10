'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useTimesheets, useUpdateTimesheet } from '@/hooks/useTimesheets';
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
  lunchOut?: string;
  lunchIn?: string;
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
  leaveType?: string; // 'MC', 'AL', 'PH', etc.
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
    lineManager?: {
      firstName: string;
      lastName: string;
    };
    project?: {
      name: string;
      client?: {
        name: string;
      };
    };
    department?: string;
    position?: string;
  };
  task?: {
    _id: string;
    name: string;
    taskId: string;
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

// Helper function to format date for Date constructor (YYYY-MM-DD format)
function formatDateForInput(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// Helper function to format time
function formatTime(timeString: string): string {
  if (!timeString) return '';
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Helper function to format time for input fields (HH:MM format)
function formatTimeForInput(timeString: string): string {
  if (!timeString) return '';
  const date = new Date(timeString);
  return date.toTimeString().slice(0, 5); // HH:MM format
}

export default function TimesheetsPage() {
  const { selectedCompany } = useCompany();
  // Start with Nov 23, 2025 (last week of generated data)
  const defaultWeekStart = getMonday(new Date('2025-11-23'));
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(defaultWeekStart);
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Use TanStack Query hooks
  const { data: weeklyTimesheets = [], isLoading: loading } = useTimesheets(
    selectedCompany?._id,
    currentWeekStart
  );
  const updateTimesheet = useUpdateTimesheet(selectedCompany?._id, currentWeekStart);

  const [selectedWeeklyTimesheet, setSelectedWeeklyTimesheet] = useState<WeeklyTimesheet | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<any>(null);

  // Dropdown data
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Fetch current user for role-based permissions
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const auth = await feathersClient.reAuthenticate();
        setUser(auth.user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        if (!selectedCompany) return;

        // Fetch projects
        const projectsData = await feathersClient.service('projects').find({
          query: { company: selectedCompany._id }
        });
        setProjects(projectsData.data || []);

        // Fetch clients
        const clientsData = await feathersClient.service('clients').find({
          query: { company: selectedCompany._id }
        });
        setClients(clientsData.data || []);

        // Fetch supervisors (workers with supervisor role)
        const supervisorsData = await feathersClient.service('workers').find({
          query: { company: selectedCompany._id, role: 'supervisor' }
        });
        setSupervisors(supervisorsData.data || []);

        // Fetch tasks
        const tasksData = await feathersClient.service('tasks').find({
          query: { company: selectedCompany._id }
        });
        setTasks(tasksData.data || []);
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };

    fetchDropdownData();
  }, [selectedCompany]);

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
    // Go to the latest week with data (Nov 23, 2025)
    setCurrentWeekStart(getMonday(new Date('2025-11-23')));
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

  // Handler functions for admin actions
  const handleEditTimesheet = (timesheet: any) => {
    setEditingTimesheet(JSON.parse(JSON.stringify(timesheet))); // Deep clone
    setIsEditMode(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (!user) {
        alert('Please log in to save changes');
        return;
      }

      console.log('Saving timesheet with user:', user);
      console.log('Editing timesheet:', editingTimesheet);

      // Prepare the update data
      const updateData = {
        dailyEntries: editingTimesheet.dailyEntries,
        totalNormalHours: editingTimesheet.totalNormalHours,
        totalOT1_5Hours: editingTimesheet.totalOT1_5Hours,
        totalOT2_0Hours: editingTimesheet.totalOT2_0Hours,
        totalHours: editingTimesheet.totalHours
      };

      // Only include task if it's changed
      if (editingTimesheet.task?._id) {
        updateData.task = editingTimesheet.task._id;
      }

      console.log('Update data:', updateData);

      // Update the timesheet via FeathersJS client
      const updatedTimesheet = await feathersClient.service('timesheets').patch(editingTimesheet._id, updateData);

      console.log('Updated timesheet:', updatedTimesheet);

      // Update the selected timesheet if it's the same one being edited
      if (selectedWeeklyTimesheet?._id === editingTimesheet._id) {
        setSelectedWeeklyTimesheet(updatedTimesheet);
      }
      setIsEditMode(false);
      setEditingTimesheet(null);
      alert('Timesheet updated successfully!');

      // Refresh the data
      window.location.reload();
    } catch (error) {
      console.error('Error updating timesheet:', error);
      alert(`Failed to update timesheet: ${error.message || 'Please try again.'}`);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingTimesheet(null);
  };

  const calculateHoursFromTimestamps = (entry: any) => {
    if (!entry.clockIn || !entry.clockOut) {
      return { normalHours: 0, ot1_5Hours: 0, ot2_0Hours: 0, totalHours: 0 };
    }

    const clockIn = new Date(entry.clockIn);
    const clockOut = new Date(entry.clockOut);
    const lunchOut = entry.lunchOut ? new Date(entry.lunchOut) : null;
    const lunchIn = entry.lunchIn ? new Date(entry.lunchIn) : null;

    // Calculate total worked time in hours
    let totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);

    // Subtract lunch break if both lunch times are provided
    if (lunchOut && lunchIn && lunchIn > lunchOut) {
      const lunchMinutes = (lunchIn.getTime() - lunchOut.getTime()) / (1000 * 60);
      totalMinutes -= lunchMinutes;
    }

    const totalHours = totalMinutes / 60;

    // Calculate normal and overtime hours
    let normalHours = 0;
    let ot1_5Hours = 0;
    let ot2_0Hours = 0;

    if (totalHours <= 8) {
      normalHours = totalHours;
    } else if (totalHours <= 10) {
      normalHours = 8;
      ot1_5Hours = totalHours - 8;
    } else {
      normalHours = 8;
      ot1_5Hours = 2;
      ot2_0Hours = totalHours - 10;
    }

    return {
      normalHours: Math.max(0, normalHours),
      ot1_5Hours: Math.max(0, ot1_5Hours),
      ot2_0Hours: Math.max(0, ot2_0Hours),
      totalHours: Math.max(0, totalHours)
    };
  };

  const handleEditFieldChange = (dayIndex: number, field: string, value: any) => {
    if (!editingTimesheet) return;

    console.log(`Editing field: ${field}, dayIndex: ${dayIndex}, value:`, value);

    const updatedTimesheet = { ...editingTimesheet };
    updatedTimesheet.dailyEntries[dayIndex][field] = value;

    const entry = updatedTimesheet.dailyEntries[dayIndex];

    // Auto-calculate hours when timestamps change
    if (['clockIn', 'clockOut', 'lunchOut', 'lunchIn'].includes(field)) {
      console.log('Calculating hours for entry:', entry);
      const calculatedHours = calculateHoursFromTimestamps(entry);
      console.log('Calculated hours:', calculatedHours);
      entry.normalHours = calculatedHours.normalHours;
      entry.ot1_5Hours = calculatedHours.ot1_5Hours;
      entry.ot2_0Hours = calculatedHours.ot2_0Hours;
      entry.totalHours = calculatedHours.totalHours;
    } else if (['normalHours', 'ot1_5Hours', 'ot2_0Hours'].includes(field)) {
      // Manual hour entry - recalculate total
      entry.totalHours = (entry.normalHours || 0) + (entry.ot1_5Hours || 0) + (entry.ot2_0Hours || 0);
    }

    // Recalculate week totals
    updatedTimesheet.totalNormalHours = updatedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.normalHours || 0), 0);
    updatedTimesheet.totalOT1_5Hours = updatedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.ot1_5Hours || 0), 0);
    updatedTimesheet.totalOT2_0Hours = updatedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.ot2_0Hours || 0), 0);
    updatedTimesheet.totalHours = updatedTimesheet.totalNormalHours + updatedTimesheet.totalOT1_5Hours + updatedTimesheet.totalOT2_0Hours;

    console.log('Updated timesheet:', updatedTimesheet);
    setEditingTimesheet(updatedTimesheet);
  };

  const handleApproveTimesheet = async (timesheetId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3030/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comments: 'Approved via dashboard' })
      });

      if (response.ok) {
        alert('✅ Timesheet approved successfully!');
        // Refresh the data
        fetchWeeklyTimesheets();
        setShowModal(false);
      } else {
        const error = await response.text();
        alert(`❌ Failed to approve: ${error}`);
      }
    } catch (error) {
      console.error('Error approving timesheet:', error);
      alert('❌ Error approving timesheet');
    }
  };

  const handleRejectTimesheet = async (timesheetId: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3030/timesheets/${timesheetId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason })
      });

      if (response.ok) {
        alert('❌ Timesheet rejected successfully!');
        // Refresh the data
        fetchWeeklyTimesheets();
        setShowModal(false);
      } else {
        const error = await response.text();
        alert(`❌ Failed to reject: ${error}`);
      }
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      alert('❌ Error rejecting timesheet');
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
            {new Date(currentWeekStart.getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-MY', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <button
            onClick={handleCurrentWeek}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-1"
          >
            Go to Latest Week
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Workers</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{weeklyTimesheets.length}</p>
            </div>
            <ClipboardDocumentCheckIcon className="h-8 w-8 text-gray-300" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium">Pending</p>
              <p className="text-xl font-bold text-blue-900 mt-1">{pendingCount}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-300" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm border border-green-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium">Approved</p>
              <p className="text-xl font-bold text-green-900 mt-1">{approvedCount}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-300" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow-sm border border-purple-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 font-medium">Total Hours</p>
              <p className="text-xl font-bold text-purple-900 mt-1">{totalHours.toFixed(1)}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-purple-300" />
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
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-white">Weekly Time Sheet</h2>
                <p className="text-sm text-indigo-100 mt-0.5">
                  {selectedWeeklyTimesheet.worker?.firstName} {selectedWeeklyTimesheet.worker?.lastName} - {selectedWeeklyTimesheet.worker?.employeeId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGeneratePDF(selectedWeeklyTimesheet)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium text-sm transition-colors"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  PDF
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:text-indigo-100 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Company Name */}
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-600">{selectedWeeklyTimesheet.company?.name || 'Company'}</p>
              </div>

              {/* Employee Info Grid - Compact */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-gray-200">
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-24">Employee Name:</span>
                      <span className="text-sm text-gray-900 font-medium">{selectedWeeklyTimesheet.worker?.firstName} {selectedWeeklyTimesheet.worker?.lastName}</span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-16">EmpID:</span>
                      <span className="text-sm text-gray-900 font-medium">{selectedWeeklyTimesheet.worker?.employeeId}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200">
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-24">Supervisor:</span>
                      {isEditMode ? (
                        <select
                          value={editingTimesheet?.worker?.lineManager?._id || ''}
                          onChange={(e) => {
                            const supervisor = supervisors.find(s => s._id === e.target.value);
                            setEditingTimesheet(prev => ({
                              ...prev,
                              worker: {
                                ...prev.worker,
                                lineManager: supervisor || null
                              }
                            }));
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
                        >
                          <option value="">Select Supervisor</option>
                          {supervisors.map(supervisor => (
                            <option key={supervisor._id} value={supervisor._id}>
                              {supervisor.firstName} {supervisor.lastName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900">
                          {selectedWeeklyTimesheet.worker?.lineManager
                            ? `${selectedWeeklyTimesheet.worker.lineManager.firstName} ${selectedWeeklyTimesheet.worker.lineManager.lastName}`
                            : '-'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-16">Location:</span>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={editingTimesheet?.worker?.department || ''}
                          onChange={(e) => {
                            setEditingTimesheet(prev => ({
                              ...prev,
                              worker: {
                                ...prev.worker,
                                department: e.target.value
                              }
                            }));
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
                          placeholder="Enter location"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">{selectedWeeklyTimesheet.worker?.department || '-'}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200">
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-24">Client:</span>
                      {isEditMode ? (
                        <select
                          value={editingTimesheet?.worker?.project?.client?._id || ''}
                          onChange={(e) => {
                            const client = clients.find(c => c._id === e.target.value);
                            setEditingTimesheet(prev => ({
                              ...prev,
                              worker: {
                                ...prev.worker,
                                project: {
                                  ...prev.worker?.project,
                                  client: client || null
                                }
                              }
                            }));
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
                        >
                          <option value="">Select Client</option>
                          {clients.map(client => (
                            <option key={client._id} value={client._id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900">{selectedWeeklyTimesheet.worker?.project?.client?.name || '-'}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-16">Project:</span>
                      {isEditMode ? (
                        <select
                          value={editingTimesheet?.worker?.project?._id || ''}
                          onChange={(e) => {
                            const project = projects.find(p => p._id === e.target.value);
                            setEditingTimesheet(prev => ({
                              ...prev,
                              worker: {
                                ...prev.worker,
                                project: project || null
                              }
                            }));
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
                        >
                          <option value="">Select Project</option>
                          {projects.map(project => (
                            <option key={project._id} value={project._id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900">{selectedWeeklyTimesheet.worker?.project?.name || '-'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Weekly Time Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-16">Task</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-12">Day</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">Date</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">Start</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">Lunch Out</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">Lunch In</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">End</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-16">Regular</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-12">OT</th>
                      <th className="border-b border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isEditMode ? editingTimesheet : selectedWeeklyTimesheet).dailyEntries.map((dayEntry, index) => {
                      const isLeaveDay = dayEntry.leaveType || (dayEntry.isAbsent && !dayEntry.clockIn);
                      const leaveLabel = dayEntry.leaveType || (isLeaveDay ? 'Absent' : '');

                      return (
                        <tr
                          key={index}
                          className={`${isLeaveDay ? 'bg-amber-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}
                        >
                          <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                            {isEditMode && index === 0 ? (
                              <select
                                value={editingTimesheet?.task?._id || ''}
                                onChange={(e) => {
                                  const task = tasks.find(t => t._id === e.target.value);
                                  setEditingTimesheet(prev => ({
                                    ...prev,
                                    task: task || null
                                  }));
                                }}
                                className="w-full text-xs border border-gray-300 rounded px-1 py-0.5"
                              >
                                <option value="">Select Task</option>
                                {tasks.map(task => (
                                  <option key={task._id} value={task._id}>
                                    {task.taskId} - {task.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="font-medium text-gray-900">{(isEditMode ? editingTimesheet : selectedWeeklyTimesheet).task?.taskId || '-'}</span>
                                <span className="text-[9px] text-gray-500 mt-0.5">{(isEditMode ? editingTimesheet : selectedWeeklyTimesheet).task?.name || 'No Task'}</span>
                              </div>
                            )}
                          </td>
                          <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-900 text-center">
                            {dayEntry.dayOfWeek}
                          </td>
                          <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                            {formatDate(dayEntry.date)}
                          </td>

                          {isLeaveDay ? (
                            <>
                              <td colSpan={4} className="border-b border-r border-gray-200 px-2 py-1.5 text-center">
                                <span className="inline-block px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-semibold text-xs">
                                  {leaveLabel}
                                </span>
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-400 text-center">-</td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-400 text-center">-</td>
                              <td className="border-b border-gray-200 px-2 py-1.5 text-xs text-gray-400 text-center">-</td>
                            </>
                          ) : (
                            <>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                                {isEditMode ? (
                                  <input
                                    type="time"
                                    value={dayEntry.clockIn ? formatTimeForInput(dayEntry.clockIn) : ''}
                                    onChange={(e) => handleEditFieldChange(index, 'clockIn', e.target.value ? new Date(`${formatDateForInput(dayEntry.date)} ${e.target.value}`) : null)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.clockIn ? formatTime(dayEntry.clockIn) : '-'
                                )}
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                                {isEditMode ? (
                                  <input
                                    type="time"
                                    value={dayEntry.lunchOut ? formatTimeForInput(dayEntry.lunchOut) : ''}
                                    onChange={(e) => handleEditFieldChange(index, 'lunchOut', e.target.value ? new Date(`${formatDateForInput(dayEntry.date)} ${e.target.value}`) : null)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.lunchOut ? formatTime(dayEntry.lunchOut) : '-'
                                )}
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                                {isEditMode ? (
                                  <input
                                    type="time"
                                    value={dayEntry.lunchIn ? formatTimeForInput(dayEntry.lunchIn) : ''}
                                    onChange={(e) => handleEditFieldChange(index, 'lunchIn', e.target.value ? new Date(`${formatDateForInput(dayEntry.date)} ${e.target.value}`) : null)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.lunchIn ? formatTime(dayEntry.lunchIn) : '-'
                                )}
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                                {isEditMode ? (
                                  <input
                                    type="time"
                                    value={dayEntry.clockOut ? formatTimeForInput(dayEntry.clockOut) : ''}
                                    onChange={(e) => handleEditFieldChange(index, 'clockOut', e.target.value ? new Date(`${formatDateForInput(dayEntry.date)} ${e.target.value}`) : null)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.clockOut ? formatTime(dayEntry.clockOut) : '-'
                                )}
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-900 text-center">
                                {isEditMode ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="24"
                                    value={dayEntry.normalHours || 0}
                                    onChange={(e) => handleEditFieldChange(index, 'normalHours', parseFloat(e.target.value) || 0)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.normalHours.toFixed(1)
                                )}
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs font-semibold text-amber-700 text-center">
                                {isEditMode ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="24"
                                    value={dayEntry.ot1_5Hours || 0}
                                    onChange={(e) => handleEditFieldChange(index, 'ot1_5Hours', parseFloat(e.target.value) || 0)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.ot1_5Hours > 0 ? dayEntry.ot1_5Hours.toFixed(1) : '-'
                                )}
                              </td>
                              <td className="border-b border-gray-200 px-2 py-1.5 text-xs font-bold text-indigo-900 text-center">
                                {dayEntry.totalHours.toFixed(1)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}

                    {/* Total Row */}
                    <tr className="bg-gradient-to-r from-indigo-50 to-indigo-100 font-bold border-t-2 border-indigo-200">
                      <td colSpan={7} className="border-r border-gray-200 px-3 py-2 text-xs text-gray-700 text-right uppercase tracking-wide">
                        Total Hours Worked
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-sm text-gray-900 text-center">
                        {(isEditMode ? editingTimesheet : selectedWeeklyTimesheet).totalNormalHours.toFixed(1)}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-sm text-amber-700 text-center">
                        {(isEditMode ? editingTimesheet : selectedWeeklyTimesheet).totalOT1_5Hours.toFixed(1)}
                      </td>
                      <td className="px-2 py-2 text-base text-indigo-900 text-center">
                        {(isEditMode ? editingTimesheet : selectedWeeklyTimesheet).totalHours.toFixed(1)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status and Week Info */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[selectedWeeklyTimesheet.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {statusConfig[selectedWeeklyTimesheet.status as keyof typeof statusConfig]?.label || selectedWeeklyTimesheet.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Week: {new Date(selectedWeeklyTimesheet.weekStartDate).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })} - {new Date(selectedWeeklyTimesheet.weekEndDate).toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                {/* Status and Action Buttons */}
                <div className="flex items-center gap-3">
                  {/* Show Edit/Approve buttons only for admin/subcon-admin */}
                  {(user?.role === 'admin' || user?.role === 'subcon-admin') && (
                    <>
                      {isEditMode ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium transition-colors"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {selectedWeeklyTimesheet.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleEditTimesheet(selectedWeeklyTimesheet)}
                                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleApproveTimesheet(selectedWeeklyTimesheet._id)}
                                className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectTimesheet(selectedWeeklyTimesheet._id)}
                                className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 font-medium transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {selectedWeeklyTimesheet.status === 'approved' && (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                              ✅ Approved - Locked
                            </span>
                          )}
                          {selectedWeeklyTimesheet.status === 'rejected' && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
                              ❌ Rejected
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setIsEditMode(false);
                      setEditingTimesheet(null);
                    }}
                    className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

