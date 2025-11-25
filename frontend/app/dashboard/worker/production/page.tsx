'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import feathersClient from '@/lib/feathers';
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export default function ProductionLogPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [worker, setWorker] = useState<any>(null);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    unitsCompleted: '',
    workType: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    try {
      const auth = await feathersClient.reAuthenticate();
      const currentUser = auth.user;
      setUser(currentUser);

      if (currentUser.role !== 'worker') {
        router.push('/dashboard');
        return;
      }

      // Fetch worker data
      if (currentUser.worker) {
        const workerData = await feathersClient.service('workers').get(currentUser.worker);
        setWorker(workerData);

        if (workerData.paymentType !== 'unit') {
          router.push('/dashboard/worker');
          return;
        }
      }

      // Fetch unit records for current month
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const response = await feathersClient.service('unit-records').find({
        query: {
          worker: currentUser.worker,
          date: {
            $gte: startOfMonth.toISOString(),
            $lte: endOfMonth.toISOString()
          },
          $limit: 100,
          $sort: { date: -1 }
        }
      });
      setProductionLogs(response.data || response);
    } catch (error) {
      console.error('Error fetching data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const unitsCompleted = parseInt(formData.unitsCompleted);
      const ratePerUnit = worker?.unitRate || 0;
      const totalAmount = unitsCompleted * ratePerUnit;

      await feathersClient.service('unit-records').create({
        worker: user.worker,
        company: user.company,
        createdBy: user._id,
        date: new Date(formData.date),
        unitsCompleted: unitsCompleted,
        unitType: formData.workType,
        ratePerUnit: ratePerUnit,
        totalAmount: totalAmount,
        notes: formData.notes,
        status: 'submitted'
      });

      setShowModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        unitsCompleted: '',
        workType: '',
        notes: ''
      });
      fetchData();
      alert('Production log submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting production log:', error);
      alert(error.message || 'Failed to submit production log');
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getTotalUnits = () => {
    return productionLogs.reduce((sum, log) => sum + (log.unitsCompleted || 0), 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon };
      case 'verified':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircleIcon };
      case 'submitted':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon };
      case 'draft':
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: ClockIcon };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: ClockIcon };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
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
              <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600" />
              Production Log
            </h1>
            <p className="text-gray-600 mt-1">Track your daily production and units completed</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Production
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4">
            <p className="text-sm text-indigo-600 font-medium">Total Units</p>
            <p className="text-3xl font-bold text-indigo-900 mt-1">{getTotalUnits()}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Unit Rate</p>
            <p className="text-3xl font-bold text-green-900 mt-1">
              RM {worker?.unitRate?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Estimated Earnings</p>
            <p className="text-3xl font-bold text-purple-900 mt-1">
              RM {((getTotalUnits() * (worker?.unitRate || 0))).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Production Logs List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Production History</h2>
        </div>
        <div className="divide-y">
          {productionLogs.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No production logs for this month</p>
              <p className="text-gray-400 text-sm mt-2">Click "Add Production" to log your work</p>
            </div>
          ) : (
            productionLogs.map((log: any) => {
              const badge = getStatusBadge(log.status);
              const StatusIcon = badge.icon;

              return (
                <div key={log._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {new Date(log.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p><strong>Units Completed:</strong> {log.unitsCompleted} units</p>
                        {log.unitsRejected > 0 && (
                          <p className="text-red-600"><strong>Units Rejected:</strong> {log.unitsRejected} units</p>
                        )}
                        <p><strong>Work Type:</strong> {log.unitType}</p>
                        <p><strong>Rate per Unit:</strong> RM {log.ratePerUnit?.toFixed(2)}</p>
                        {log.notes && <p><strong>Notes:</strong> {log.notes}</p>}
                        <p><strong>Total Amount:</strong> RM {log.totalAmount?.toFixed(2)}</p>
                        {log.rejectionReason && (
                          <p className="text-red-600"><strong>Rejection Reason:</strong> {log.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Production Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Add Production</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Units Completed
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.unitsCompleted}
                  onChange={(e) => setFormData({ ...formData, unitsCompleted: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter number of units"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Type
                </label>
                <input
                  type="text"
                  value={formData.workType}
                  onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Assembly, Packaging, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


