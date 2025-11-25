'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import feathersClient from '@/lib/feathers';
import {
  CalendarDaysIcon,
  PlusIcon,
  ArrowLeftIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

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

      // Fetch leave types
      const typesResponse = await feathersClient.service('leave-types').find({
        query: {
          company: currentUser.company,
          isActive: true,
          $limit: 100
        }
      });
      setLeaveTypes(typesResponse.data || typesResponse);

      // Fetch leave balances
      const currentYear = new Date().getFullYear();
      const balancesResponse = await feathersClient.service('leave-balances').find({
        query: {
          worker: currentUser.worker,
          year: currentYear,
          $limit: 100
        }
      });
      setLeaveBalances(balancesResponse.data || balancesResponse);

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

      await feathersClient.service('leave-requests').create({
        worker: user.worker,
        company: user.company,
        leaveType: formData.leaveType,
        startDate: startDate,
        endDate: endDate,
        totalDays: totalDays,
        reason: formData.reason,
        status: 'pending',
        isHalfDay: isHalfDay,
        halfDayPeriod: isHalfDay ? halfDayPeriod : undefined
      });

      setShowModal(false);
      setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      setIsHalfDay(false);
      setHalfDayPeriod('AM');
      fetchData();
      alert('Leave request submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      alert(error.message || 'Failed to submit leave request');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon }
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
                    hasLeave ? `${leaveRequest.leaveType?.name || 'Leave'} - ${leaveRequest.status}` :
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
                      {leaveRequest.leaveType?.code || 'L'}
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
                        {request.leaveType?.name || 'Leave'}
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
                    </div>
                  </div>
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
