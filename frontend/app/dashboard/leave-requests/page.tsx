'use client';

import { useEffect, useState } from 'react';
import feathersClient from '@/lib/feathers';
import { API_URL } from '@/lib/config';
import Calendar from '@/components/Calendar';
import { SignedImage } from '@/hooks/useSignedUrl';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TableCellsIcon,
  CalendarIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';

interface LeaveRequest {
  _id: string;
  worker: any;
  leaveType: any;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  documents?: Array<{ name: string; url: string; uploadDate: Date }>;
  isHalfDay?: boolean;
  halfDayPeriod?: 'AM' | 'PM';
}

export default function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const response = await feathersClient.service('leave-requests').find({
        query: {
          $limit: 1000,
          $populate: ['worker', 'leaveType']
        }
      });
      const data = Array.isArray(response) ? response : response.data || [];
      setLeaveRequests(data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      // Use custom approve endpoint that updates timesheet and leave balance
      const token = localStorage.getItem('feathers-jwt');
      await fetch(`${API_URL}/leave-requests/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error approving leave:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await feathersClient.service('leave-requests').patch(id, { status: 'rejected' });
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error rejecting leave:', error);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave request? This will restore the leave balance if already approved.')) {
      return;
    }
    try {
      // Use custom cancel endpoint that updates timesheet and restores leave balance
      const token = localStorage.getItem('feathers-jwt');
      await fetch(`${API_URL}/leave-requests/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error cancelling leave:', error);
    }
  };

  const filteredRequests = leaveRequests.filter(req =>
    filter === 'all' ? true : req.status === filter
  );

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(r => r.status === 'pending').length,
    approved: leaveRequests.filter(r => r.status === 'approved').length,
    rejected: leaveRequests.filter(r => r.status === 'rejected').length,
    cancelled: leaveRequests.filter(r => r.status === 'cancelled').length,
  };

  // Convert leave requests to calendar events
  const calendarEvents = filteredRequests.flatMap(request => {
    const events = [];
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const leaveTypeName = request.leaveType?.name || request.leaveTypeName || 'Leave';

    // Create an event for each day in the leave period
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      events.push({
        id: `${request._id}-${d.getTime()}`,
        date: new Date(d),
        title: `${request.worker?.firstName} ${request.worker?.lastName} - ${leaveTypeName}`,
        type: request.status === 'pending' ? 'pending-leave' as const : 'leave' as const,
        color: request.status === 'approved'
          ? 'bg-green-100 text-green-800 border-l-4 border-green-500'
          : request.status === 'rejected'
          ? 'bg-red-100 text-red-800 border-l-4 border-red-500'
          : request.status === 'cancelled'
          ? 'bg-gray-100 text-gray-800 border-l-4 border-gray-500'
          : 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500',
        worker: `${request.worker?.firstName} ${request.worker?.lastName}`,
        status: request.status
      });
    }

    return events;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-xs md:text-base text-gray-600 mt-1">Manage employee leave requests and approvals</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1.5 md:gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm ${
              viewMode === 'table'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <TableCellsIcon className="h-4 w-4 md:h-5 md:w-5" />
            Table
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm ${
              viewMode === 'calendar'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CalendarIcon className="h-4 w-4 md:h-5 md:w-5" />
            Calendar
          </button>
        </div>
      </div>

      {/* Stats Cards - Compact on mobile */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
        <div className="bg-white rounded-lg shadow-md p-2 md:p-6">
          <p className="text-[10px] md:text-sm text-gray-600 font-medium">Total</p>
          <p className="text-lg md:text-3xl font-bold text-gray-900 mt-0.5 md:mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-2 md:p-6">
          <p className="text-[10px] md:text-sm text-gray-600 font-medium">Pending</p>
          <p className="text-lg md:text-3xl font-bold text-yellow-600 mt-0.5 md:mt-2">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-2 md:p-6">
          <p className="text-[10px] md:text-sm text-gray-600 font-medium">Approved</p>
          <p className="text-lg md:text-3xl font-bold text-green-600 mt-0.5 md:mt-2">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-2 md:p-6 hidden md:block">
          <p className="text-[10px] md:text-sm text-gray-600 font-medium">Rejected</p>
          <p className="text-lg md:text-3xl font-bold text-red-600 mt-0.5 md:mt-2">{stats.rejected}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-2 md:p-6 hidden md:block">
          <p className="text-[10px] md:text-sm text-gray-600 font-medium">Cancelled</p>
          <p className="text-lg md:text-3xl font-bold text-gray-600 mt-0.5 md:mt-2">{stats.cancelled}</p>
        </div>
      </div>

      {/* Filters - Scrollable on mobile */}
      <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setFilter('all')}
          className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
            filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
            filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
            filter === 'approved' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
            filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Rejected
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
            filter === 'cancelled' ? 'bg-gray-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Cancelled
        </button>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-500"></div>
              <span className="text-sm text-gray-600">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-l-4 border-green-500"></div>
              <span className="text-sm text-gray-600">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-l-4 border-red-500"></div>
              <span className="text-sm text-gray-600">Rejected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-l-4 border-gray-500"></div>
              <span className="text-sm text-gray-600">Cancelled</span>
            </div>
          </div>
          <Calendar events={calendarEvents} />
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
            <p className="mt-1 text-sm text-gray-500">No leave requests found for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {request.worker?.profilePicture ? (
                            <SignedImage
                              src={request.worker.profilePicture}
                              alt={`${request.worker?.firstName || ''} ${request.worker?.lastName || ''}`}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-600 font-medium text-sm">
                                {request.worker?.firstName?.[0]}{request.worker?.lastName?.[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {request.worker?.firstName} {request.worker?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{request.worker?.employeeId || request.worker?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {request.leaveTypeCode && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                            {request.leaveTypeCode}
                          </span>
                        )}
                        <span className="text-sm text-gray-900">
                          {request.leaveType?.name || request.leaveTypeName || 'N/A'}
                        </span>
                      </div>
                      {request.isHalfDay && (
                        <span className="text-xs text-indigo-600">(Half Day - {request.halfDayPeriod})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(request.startDate).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-sm text-gray-500">
                        to {new Date(request.endDate).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{request.totalDays} days</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{request.reason}</span>
                      {request.documents && request.documents.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <PaperClipIcon className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{request.documents.length} doc(s)</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        request.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status === 'pending' && <ClockIcon className="h-3 w-3 mr-1" />}
                        {request.status === 'approved' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
                        {request.status === 'rejected' && <XCircleIcon className="h-3 w-3 mr-1" />}
                        {request.status === 'cancelled' && <XCircleIcon className="h-3 w-3 mr-1" />}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(request._id)}
                            className="text-green-600 hover:text-green-900 font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request._id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleCancel(request._id)}
                            className="text-gray-600 hover:text-gray-900 font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {request.status === 'approved' && (
                        <button
                          onClick={() => handleCancel(request._id)}
                          className="text-orange-600 hover:text-orange-900 font-medium"
                        >
                          Cancel Leave
                        </button>
                      )}
                      {(request.status === 'rejected' || request.status === 'cancelled') && (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      )}
    </div>
  );
}

