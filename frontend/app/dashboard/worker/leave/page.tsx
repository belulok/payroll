'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import feathersClient from '@/lib/feathers';
import { API_URL } from '@/lib/config';
import {
  CalendarDaysIcon,
  PlusIcon,
  ArrowLeftIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PaperClipIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface UploadedDocument {
  name: string;
  url: string;
  uploadDate: Date;
}

export default function WorkerLeavePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'AM' | 'PM'>('AM');
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchHolidays();
    }
  }, [currentMonth, user]);

  const fetchData = async () => {
    try {
      const auth = await feathersClient.reAuthenticate();
      const currentUser = auth.user;
      setUser(currentUser);

      if (currentUser.role !== 'worker') {
        router.push('/dashboard');
        return;
      }

      // Fetch worker details to get their group and job band
      let workerData = null;
      try {
        workerData = await feathersClient.service('workers').get(currentUser.worker);
      } catch (e) {
        console.log('Could not fetch worker details');
      }

      // Fetch compensation config to get leave entitlements based on group/job band
      let leaveTypesFromConfig: any[] = [];
      try {
        const configResponse = await feathersClient.service('compensation-configs').find({
          query: {
            company: currentUser.company,
            $limit: 1
          }
        });
        const config = configResponse.data?.[0] || configResponse[0];

        if (config && config.benefitConfigs) {
          // Find matching benefit config for this worker's group or job band
          const workerGroupId = typeof workerData?.workerGroup === 'object'
            ? workerData.workerGroup._id
            : workerData?.workerGroup;
          const workerJobBandId = typeof workerData?.jobBand === 'object'
            ? workerData.jobBand._id
            : workerData?.jobBand;

          // Find the matching config
          let matchingConfig = config.benefitConfigs.find((bc: any) => {
            if (bc.configType === 'group' && bc.group === workerGroupId) return true;
            if (bc.configType === 'jobBand' && bc.jobBand === workerJobBandId) return true;
            return false;
          });

          // If no specific match, try to find a default config
          if (!matchingConfig && config.benefitConfigs.length > 0) {
            matchingConfig = config.benefitConfigs[0];
          }

          if (matchingConfig) {
            // Use dynamic leave entitlements from config
            if (matchingConfig.leaveEntitlements && matchingConfig.leaveEntitlements.length > 0) {
              leaveTypesFromConfig = matchingConfig.leaveEntitlements.map((le: any, index: number) => ({
                _id: `leave-${le.code || index}`,
                name: le.name,
                code: le.code,
                defaultDaysAllowed: le.daysPerYear,
                isPaid: le.isPaid,
                requiresApproval: le.requiresApproval,
                requiresDocument: le.requiresDocument
              }));
            } else {
              // Fallback to legacy annualLeave/sickLeave if no leaveEntitlements
              if (matchingConfig.annualLeave > 0) {
                leaveTypesFromConfig.push({
                  _id: 'annual-leave',
                  name: 'Annual Leave',
                  code: 'AL',
                  defaultDaysAllowed: matchingConfig.annualLeave,
                  isPaid: true
                });
              }
              if (matchingConfig.sickLeave > 0) {
                leaveTypesFromConfig.push({
                  _id: 'sick-leave',
                  name: 'Sick Leave',
                  code: 'SL',
                  defaultDaysAllowed: matchingConfig.sickLeave,
                  isPaid: true
                });
              }
            }
          }
        }
      } catch (e) {
        console.log('Could not fetch compensation config:', e);
      }

      // Also try to fetch from leave-types service (fallback)
      try {
        const typesResponse = await feathersClient.service('leave-types').find({
          query: {
            company: currentUser.company,
            isActive: true,
            $limit: 100
          }
        });
        const serviceLeaveTypes = typesResponse.data || typesResponse || [];
        // Merge with config leave types (config takes priority)
        if (serviceLeaveTypes.length > 0 && leaveTypesFromConfig.length === 0) {
          leaveTypesFromConfig = serviceLeaveTypes;
        }
      } catch (e) {
        console.log('Could not fetch leave-types service');
      }

      setLeaveTypes(leaveTypesFromConfig);

      // Fetch leave balances or create virtual ones from config
      const currentYear = new Date().getFullYear();
      let balances: any[] = [];

      try {
        const balancesResponse = await feathersClient.service('leave-balances').find({
          query: {
            worker: currentUser.worker,
            year: currentYear,
            $limit: 100
          }
        });
        balances = balancesResponse.data || balancesResponse || [];
      } catch (e) {
        console.log('Could not fetch leave balances');
      }

      // If no balances exist, create virtual balances from leave types
      if (balances.length === 0 && leaveTypesFromConfig.length > 0) {
        balances = leaveTypesFromConfig.map((lt: any) => ({
          _id: `virtual-${lt._id}`,
          leaveType: lt,
          totalDays: lt.defaultDaysAllowed,
          usedDays: 0,
          pendingDays: 0,
          year: currentYear
        }));
      }

      setLeaveBalances(balances);

      // Fetch leave requests
      const requestsResponse = await feathersClient.service('leave-requests').find({
        query: {
          worker: currentUser.worker,
          $limit: 100,
          $sort: {
            createdAt: -1
          }
        }
      });
      setLeaveRequests(requestsResponse.data || requestsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const response = await feathersClient.service('gazetted-holidays').find({
        query: {
          company: user.company,
          date: {
            $gte: startDate.toISOString(),
            $lte: endDate.toISOString()
          },
          isActive: true,
          $limit: 100
        }
      });
      setHolidays(response.data || response);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leaveType) {
      alert('Please select a leave type');
      return;
    }

    try {
      const startDate = new Date(formData.startDate);
      const endDate = isHalfDay ? new Date(formData.startDate) : new Date(formData.endDate);

      let totalDays;
      if (isHalfDay) {
        totalDays = 0.5;
      } else {
        totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }

      // Find the selected leave type
      const selectedLeaveType = leaveTypes.find((lt: any) => lt._id === formData.leaveType);

      // Check remaining balance
      const balance = leaveBalances.find((b: any) => b.leaveType?._id === formData.leaveType);
      const remaining = balance ? balance.totalDays - balance.usedDays - balance.pendingDays : 0;

      if (totalDays > remaining) {
        alert(`Insufficient leave balance. You have ${remaining} days remaining.`);
        return;
      }

      // Prepare leave request data - store leave type name for display
      const leaveRequestData: any = {
        worker: user.worker,
        company: user.company,
        startDate: startDate,
        endDate: endDate,
        totalDays: totalDays,
        reason: formData.reason,
        status: 'pending',
        isHalfDay: isHalfDay,
        halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
        leaveTypeName: selectedLeaveType?.name,
        leaveTypeCode: selectedLeaveType?.code,
        // Include uploaded documents (optional)
        documents: uploadedDocs.length > 0 ? uploadedDocs : undefined
      };

      // Only include leaveType ObjectId if it's not a virtual ID
      // Virtual IDs start with 'leave-' or 'annual-' or 'sick-' or 'virtual-'
      const isVirtualId = formData.leaveType && (
        formData.leaveType.startsWith('leave-') ||
        formData.leaveType.startsWith('annual-') ||
        formData.leaveType.startsWith('sick-') ||
        formData.leaveType.startsWith('virtual-')
      );
      if (formData.leaveType && !isVirtualId) {
        leaveRequestData.leaveType = formData.leaveType;
      }

      await feathersClient.service('leave-requests').create(leaveRequestData);

      setShowModal(false);
      setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      setIsHalfDay(false);
      setHalfDayPeriod('AM');
      setUploadedDocs([]);
      fetchData();
      alert('Leave request submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      alert(error.message || 'Failed to submit leave request');
    }
  };

  // Handle cancel leave request
  const handleCancelLeave = async (leaveId: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }

    try {
      const token = localStorage.getItem('feathers-jwt');
      const response = await fetch(`${API_URL}/leave-requests/${leaveId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel leave');
      }

      alert('Leave request cancelled successfully!');
      fetchData(); // Refresh the list
    } catch (error: any) {
      console.error('Error cancelling leave:', error);
      alert(error.message || 'Failed to cancel leave request');
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newDocs: UploadedDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('${API_URL}/uploads', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('feathers-jwt')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          newDocs.push({
            name: file.name,
            url: result.url || result.id,
            uploadDate: new Date()
          });
        } else {
          console.error('Failed to upload:', file.name);
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    setUploadedDocs([...uploadedDocs, ...newDocs]);
    setIsUploading(false);

    // Reset file input
    e.target.value = '';
  };

  // Remove uploaded document
  const removeDocument = (index: number) => {
    setUploadedDocs(uploadedDocs.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircleIcon }
    };
    return badges[status] || badges.pending;
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getLeaveBalance = (leaveTypeName: string) => {
    const balance = leaveBalances.find((b: any) =>
      b.leaveType?.name?.toLowerCase() === leaveTypeName.toLowerCase()
    );
    return balance;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const isDateInLeaveRequest = (date: Date) => {
    return leaveRequests.some((request: any) => {
      if (request.status === 'rejected' || request.status === 'cancelled') return false;
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const getLeaveRequestForDate = (date: Date) => {
    return leaveRequests.find((request: any) => {
      if (request.status === 'rejected' || request.status === 'cancelled') return false;
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const isHoliday = (date: Date) => {
    return holidays.some((holiday: any) => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === date.toDateString();
    });
  };

  const getHolidayForDate = (date: Date) => {
    return holidays.find((holiday: any) => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === date.toDateString();
    });
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
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
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/worker')}
          className="flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarDaysIcon className="h-8 w-8 text-purple-600" />
              Leave Requests
            </h1>
            <p className="text-gray-600 mt-1">Submit and track your leave requests</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            New Leave Request
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {leaveBalances.map((balance: any, index: number) => {
          const remaining = balance.totalDays - balance.usedDays - balance.pendingDays;
          const colorClasses = [
            'text-indigo-600',
            'text-green-600',
            'text-purple-600',
            'text-orange-600',
            'text-blue-600',
            'text-pink-600'
          ];
          const colorClass = colorClasses[index % colorClasses.length];

          return (
            <div key={balance._id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm text-gray-600 mb-2">{balance.leaveType?.name || 'Leave'}</h3>
              <p className={`text-3xl font-bold ${colorClass}`}>
                {remaining} / {balance.totalDays}
              </p>
              <p className="text-sm text-gray-500 mt-1">Remaining / Total</p>
              {balance.pendingDays > 0 && (
                <p className="text-xs text-yellow-600 mt-2">
                  {balance.pendingDays} days pending approval
                </p>
              )}
              {balance.usedDays > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {balance.usedDays} days used
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Leave Calendar</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-lg font-medium text-gray-900 min-w-[200px] text-center">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
              {day}
            </div>
          ))}

          {(() => {
            const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
            const days = [];

            // Empty cells for days before month starts
            for (let i = 0; i < startingDayOfWeek; i++) {
              days.push(
                <div key={`empty-${i}`} className="aspect-square p-2"></div>
              );
            }

            // Days of the month
            for (let day = 1; day <= daysInMonth; day++) {
              const date = new Date(year, month, day);
              const isToday = date.toDateString() === new Date().toDateString();
              const leaveRequest = getLeaveRequestForDate(date);
              const hasLeave = !!leaveRequest;
              const holiday = getHolidayForDate(date);
              const isHol = !!holiday;

              days.push(
                <div
                  key={day}
                  className={`aspect-square p-2 border rounded-lg ${
                    isToday ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                  } ${
                    isHol ? 'bg-red-50' :
                    hasLeave ? (
                      leaveRequest.status === 'approved' ? 'bg-green-100' :
                      leaveRequest.status === 'pending' ? 'bg-yellow-100' :
                      'bg-gray-50'
                    ) : 'bg-white'
                  }`}
                  title={
                    isHol ? `${holiday.name} (Holiday)` :
                    hasLeave ? `${leaveRequest.leaveType?.name || leaveRequest.leaveTypeName || 'Leave'} - ${leaveRequest.status}` :
                    ''
                  }
                >
                  <div className="text-sm font-medium text-gray-900">{day}</div>
                  {isHol && (
                    <div className="text-xs mt-1 text-red-700 font-semibold">
                      HOL
                    </div>
                  )}
                  {!isHol && hasLeave && (
                    <div className={`text-xs mt-1 ${
                      leaveRequest.status === 'approved' ? 'text-green-700' :
                      leaveRequest.status === 'pending' ? 'text-yellow-700' :
                      'text-gray-600'
                    }`}>
                      {leaveRequest.leaveType?.code || leaveRequest.leaveTypeCode || 'L'}
                    </div>
                  )}
                </div>
              );
            }

            return days;
          })()}
        </div>

        <div className="flex items-center gap-6 mt-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-gray-200 rounded"></div>
            <span className="text-gray-600">Public Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-gray-200 rounded"></div>
            <span className="text-gray-600">Approved Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-gray-200 rounded"></div>
            <span className="text-gray-600">Pending Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-500 bg-indigo-50 rounded"></div>
            <span className="text-gray-600">Today</span>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Leave Requests History</h2>

      {leaveRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CalendarDaysIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Leave Requests</h3>
          <p className="text-gray-600">You haven't submitted any leave requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leaveRequests.map((request) => {
            const badge = getStatusBadge(request.status);
            const StatusIcon = badge.icon;
            return (
              <div key={request._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">
                        {request.leaveType?.name || request.leaveTypeName || 'Leave'}
                        {request.isHalfDay && (
                          <span className="text-sm font-normal text-indigo-600 ml-2">
                            (Half Day - {request.halfDayPeriod})
                          </span>
                        )}
                      </h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
                        <StatusIcon className="h-4 w-4 mr-1" />
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <strong>Duration:</strong> {new Date(request.startDate).toLocaleDateString()}
                        {!request.isHalfDay && ` - ${new Date(request.endDate).toLocaleDateString()}`}
                        ({request.totalDays} {request.totalDays === 1 || request.totalDays === 0.5 ? 'day' : 'days'})
                      </p>
                      <p><strong>Reason:</strong> {request.reason}</p>
                      {request.approvedBy && (
                        <p><strong>Approved by:</strong> {request.approvedBy.firstName} {request.approvedBy.lastName}</p>
                      )}
                      {request.rejectionReason && (
                        <p className="text-red-600"><strong>Rejection Reason:</strong> {request.rejectionReason}</p>
                      )}
                      {request.cancelledBy && (
                        <p className="text-gray-600"><strong>Cancelled:</strong> {new Date(request.cancelledAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  {/* Cancel button for pending or approved leave */}
                  {(request.status === 'pending' || request.status === 'approved') && (
                    <button
                      onClick={() => handleCancelLeave(request._id)}
                      className="ml-4 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">New Leave Request</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map((type: any) => {
                    const balance = leaveBalances.find((b: any) => b.leaveType?._id === type._id);
                    const remaining = balance ? balance.totalDays - balance.usedDays - balance.pendingDays : 0;
                    return (
                      <option key={type._id} value={type._id}>
                        {type.name} ({remaining} days remaining)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="halfDay"
                    checked={isHalfDay}
                    onChange={(e) => {
                      setIsHalfDay(e.target.checked);
                      if (e.target.checked) {
                        setFormData({ ...formData, endDate: formData.startDate });
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="halfDay" className="text-sm font-medium text-gray-700">
                    Half Day Leave
                  </label>
                </div>

                {isHalfDay && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHalfDayPeriod('AM')}
                      className={`px-4 py-1 rounded-lg text-sm font-medium transition-colors ${
                        halfDayPeriod === 'AM'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setHalfDayPeriod('PM')}
                      className={`px-4 py-1 rounded-lg text-sm font-medium transition-colors ${
                        halfDayPeriod === 'PM'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      PM
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData({ ...formData, startDate: e.target.value });
                    if (isHalfDay) {
                      setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={isHalfDay ? formData.startDate : formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    isHalfDay ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  disabled={isHalfDay}
                  required={!isHalfDay}
                />
                {isHalfDay && (
                  <p className="text-xs text-gray-500 mt-1">
                    End date is same as start date for half-day leave
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Document Upload Section (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supporting Documents <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    id="doc-upload"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="doc-upload"
                    className={`flex flex-col items-center justify-center cursor-pointer ${isUploading ? 'opacity-50' : ''}`}
                  >
                    <PaperClipIcon className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      {isUploading ? 'Uploading...' : 'Click to upload documents'}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      PDF, DOC, DOCX, JPG, PNG (Multiple files allowed)
                    </span>
                  </label>
                </div>

                {/* Uploaded Documents List */}
                {uploadedDocs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedDocs.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <PaperClipIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700 truncate max-w-[200px]">
                            {doc.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
