'use client';

import { useEffect, useState } from 'react';
import feathersClient from '@/lib/feathers';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CubeIcon,
  PlusIcon,
  PencilIcon,
  ArchiveBoxIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Worker {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  paymentType: 'monthly-salary' | 'hourly' | 'unit-based';
  employmentStatus: string;
  isActive?: boolean;
  payrollInfo: {
    monthlySalary?: number;
    hourlyRate?: number;
    unitRates?: Array<{ unitType: string; ratePerUnit: number }>;
    currency: string;
  };
  leaveTier?: string;
}

const paymentTypeConfig = {
  'monthly-salary': {
    label: 'Monthly Salary',
    icon: CurrencyDollarIcon,
    color: 'bg-blue-100 text-blue-800',
    iconColor: 'text-blue-600'
  },
  'hourly': {
    label: 'Hourly',
    icon: ClockIcon,
    color: 'bg-green-100 text-green-800',
    iconColor: 'text-green-600'
  },
  'unit-based': {
    label: 'Unit-Based',
    icon: CubeIcon,
    color: 'bg-purple-100 text-purple-800',
    iconColor: 'text-purple-600'
  }
};

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState<Partial<Worker>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    paymentType: 'monthly-salary',
    employmentStatus: 'active',
    isActive: true,
    payrollInfo: {
      currency: 'MYR'
    }
  });

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const response = await feathersClient.service('workers').find({
        query: {
          $limit: 100,
          $sort: { employeeId: 1 }
        }
      });
      setWorkers(response.data || response);
    } catch (error) {
      console.error('Error fetching workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = () => {
    setEditingWorker(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      paymentType: 'monthly-salary',
      employmentStatus: 'active',
      isActive: true,
      payrollInfo: {
        currency: 'MYR'
      }
    });
    setShowModal(true);
  };

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData(worker);
    setShowModal(true);
  };

  const handleArchiveWorker = async (workerId: string) => {
    if (!confirm('Are you sure you want to archive this worker? They will be moved to the archived section.')) {
      return;
    }
    try {
      await feathersClient.service('workers').patch(workerId, { isActive: false });
      fetchWorkers();
    } catch (error) {
      console.error('Error archiving worker:', error);
      alert('Failed to archive worker');
    }
  };

  const handleUnarchiveWorker = async (workerId: string) => {
    try {
      await feathersClient.service('workers').patch(workerId, { isActive: true });
      fetchWorkers();
    } catch (error) {
      console.error('Error unarchiving worker:', error);
      alert('Failed to unarchive worker');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWorker) {
        await feathersClient.service('workers').patch(editingWorker._id, formData);
      } else {
        await feathersClient.service('workers').create(formData);
      }
      setShowModal(false);
      fetchWorkers();
    } catch (error) {
      console.error('Error saving worker:', error);
      alert('Failed to save worker');
    }
  };

  const activeWorkers = workers.filter(w => w.isActive !== false);
  const archivedWorkers = workers.filter(w => w.isActive === false);

  const displayWorkers = showArchived ? archivedWorkers : activeWorkers;
  const filteredWorkers = filter === 'all'
    ? displayWorkers
    : displayWorkers.filter(w => w.paymentType === filter);

  const getPaymentDisplay = (worker: Worker) => {
    if (worker.paymentType === 'monthly-salary') {
      return `RM ${worker.payrollInfo.monthlySalary?.toLocaleString()}/month`;
    } else if (worker.paymentType === 'hourly') {
      return `RM ${worker.payrollInfo.hourlyRate}/hour`;
    } else {
      const rates = worker.payrollInfo.unitRates || [];
      if (rates.length > 0) {
        return `${rates.length} rate${rates.length > 1 ? 's' : ''}`;
      }
      return 'No rates set';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workers</h1>
          <p className="text-gray-600 mt-2">Manage employee records and information</p>
        </div>
        <button
          onClick={handleAddWorker}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md"
        >
          <PlusIcon className="h-5 w-5" />
          Add Worker
        </button>
      </div>

      {/* Active/Archived Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowArchived(false)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !showArchived
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Active Workers ({activeWorkers.length})
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            showArchived
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ArchiveBoxIcon className="h-5 w-5" />
          Archived ({archivedWorkers.length})
        </button>
      </div>

      {/* Stats Cards */}
      {!showArchived && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Workers</p>
                <p className="text-2xl font-bold text-gray-900">{activeWorkers.length}</p>
              </div>
              <UserGroupIcon className="h-10 w-10 text-gray-400" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Monthly Salary</p>
                <p className="text-2xl font-bold text-blue-900">
                  {activeWorkers.filter(w => w.paymentType === 'monthly-salary').length}
                </p>
              </div>
              <CurrencyDollarIcon className="h-10 w-10 text-blue-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Hourly</p>
                <p className="text-2xl font-bold text-green-900">
                  {activeWorkers.filter(w => w.paymentType === 'hourly').length}
                </p>
              </div>
              <ClockIcon className="h-10 w-10 text-green-400" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Unit-Based</p>
                <p className="text-2xl font-bold text-purple-900">
                  {activeWorkers.filter(w => w.paymentType === 'unit-based').length}
                </p>
              </div>
              <CubeIcon className="h-10 w-10 text-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Workers ({workers.length})
          </button>
          <button
            onClick={() => setFilter('monthly-salary')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'monthly-salary'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Monthly Salary ({workers.filter(w => w.paymentType === 'monthly-salary').length})
          </button>
          <button
            onClick={() => setFilter('hourly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'hourly'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hourly ({workers.filter(w => w.paymentType === 'hourly').length})
          </button>
          <button
            onClick={() => setFilter('unit-based')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'unit-based'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unit-Based ({workers.filter(w => w.paymentType === 'unit-based').length})
          </button>
        </div>
      </div>

      {/* Workers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate/Salary
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
            {filteredWorkers.map((worker) => {
              const config = paymentTypeConfig[worker.paymentType as keyof typeof paymentTypeConfig] || paymentTypeConfig['hourly'];
              const Icon = config.icon;

              return (
                <tr key={worker._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold">
                          {worker.firstName?.[0] || ''}{worker.lastName?.[0] || ''}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {worker.firstName} {worker.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{worker.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{worker.position}</div>
                    <div className="text-sm text-gray-500">{worker.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                      <Icon className={`h-4 w-4 mr-1 ${config.iconColor}`} />
                      {config.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getPaymentDisplay(worker)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      worker.employmentStatus === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {worker.employmentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!showArchived ? (
                      <>
                        <button
                          onClick={() => handleEditWorker(worker)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4 inline-flex items-center gap-1"
                        >
                          <PencilIcon className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleArchiveWorker(worker._id)}
                          className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
                        >
                          <ArchiveBoxIcon className="h-4 w-4" />
                          Archive
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleUnarchiveWorker(worker._id)}
                        className="text-green-600 hover:text-green-900 inline-flex items-center gap-1"
                      >
                        Unarchive
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredWorkers.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No workers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {showArchived
                ? 'No archived workers.'
                : filter === 'all'
                ? 'Get started by adding a new worker.'
                : 'No workers with this payment type.'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Worker Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingWorker ? 'Edit Worker' : 'Add New Worker'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.position || ''}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.department || ''}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Type *
                    </label>
                    <select
                      required
                      value={formData.paymentType || 'monthly-salary'}
                      onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="monthly-salary">Monthly Salary</option>
                      <option value="hourly">Hourly</option>
                      <option value="unit-based">Unit-Based</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employment Status *
                    </label>
                    <select
                      required
                      value={formData.employmentStatus || 'active'}
                      onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="probation">Probation</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
                {formData.paymentType === 'monthly-salary' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Salary (RM) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.payrollInfo?.monthlySalary || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        payrollInfo: { ...formData.payrollInfo, monthlySalary: parseFloat(e.target.value), currency: 'MYR' }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}
                {formData.paymentType === 'hourly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate (RM) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.payrollInfo?.hourlyRate || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        payrollInfo: { ...formData.payrollInfo, hourlyRate: parseFloat(e.target.value), currency: 'MYR' }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingWorker ? 'Update Worker' : 'Add Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

