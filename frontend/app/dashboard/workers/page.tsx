'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useWorkers, useCreateWorker, useUpdateWorker, useArchiveWorker, useUnarchiveWorker } from '@/hooks/useWorkers';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/useCompanies';
import feathersClient from '@/lib/feathers';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CubeIcon,
  PlusIcon,
  PencilIcon,
  ArchiveBoxIcon,
  XMarkIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent' | 'subcon-admin' | 'worker' | 'user';
  company?: string;
  worker?: string;
}

interface Company {
  _id: string;
  name: string;
  registrationNumber?: string;
}

interface LineManager {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  position: string;
}

interface Client {
  _id: string;
  name: string;
  contactPerson?: string;
  email?: string;
}

interface Worker {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  jobDesignation?: string;
  department: string;
  project?: string;
  lineManager?: string | LineManager;
  client?: string | Client;
  company?: string | Company;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  passportCountry?: string;
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
  user?: string;
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
  const { selectedCompany } = useCompany();

  // Use TanStack Query hooks
  const { data: workers = [], isLoading: loading } = useWorkers(selectedCompany?._id);
	  const { data: clients = [] } = useClients(selectedCompany?._id);
	  const { data: projects = [] } = useProjects(selectedCompany?._id);
  const { data: companies = [] } = useCompanies();

  // Debug: Log workers data to see if population is working
  console.log('Workers data:', workers);
  const createWorker = useCreateWorker(selectedCompany?._id);
  const updateWorker = useUpdateWorker(selectedCompany?._id);
  const archiveWorker = useArchiveWorker(selectedCompany?._id);
  const unarchiveWorker = useUnarchiveWorker(selectedCompany?._id);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [formData, setFormData] = useState<Partial<Worker>>({
    employeeId: '',
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

	// Determine which company the form should use for dropdowns. For admin/agent,
	// this is based on the company selected in the form (if any); otherwise we
	// fall back to the header's selectedCompany. For subcon and other roles, we
	// always use selectedCompany.
	const formCompanyId =
	  currentUser && (currentUser.role === 'admin' || currentUser.role === 'agent')
	    ? (typeof formData.company === 'string' && formData.company) || selectedCompany?._id
	    : selectedCompany?._id;

	// Scoped lists for the form dropdowns so we never mix clients/projects/workers
	// from different companies when assigning a worker.
	const { data: formWorkers = [] } = useWorkers(formCompanyId);
	const { data: formClients = [] } = useClients(formCompanyId);
	const { data: formProjects = [] } = useProjects(formCompanyId);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const auth = await feathersClient.get('authentication');
        if (auth && auth.user) {
          setCurrentUser(auth.user);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const handleAddWorker = () => {
    setEditingWorker(null);
    setFormData({
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      paymentType: 'monthly-salary',
      employmentStatus: 'active',
      isActive: true,
      company: currentUser?.role === 'admin' ? '' : selectedCompany?._id,
      payrollInfo: {
        currency: 'MYR'
      }
    });
    setShowModal(true);
  };

	  const handleEditWorker = (worker: Worker) => {
	    setEditingWorker(worker);

	    // When editing, try to normalise project value to the project _id so the
	    // dropdown can pre-select the correct option. Fall back to the original
	    // value (name) if we can't find a matching project.
	    const matchingProject = projects.find(
	      (p) => p._id === worker.project || p.name === worker.project
	    );

	    setFormData({
	      ...worker,
	      project: matchingProject ? matchingProject._id : worker.project,
      company: typeof worker.company === 'string' ? worker.company : worker.company?._id,
	    });
	    setShowModal(true);
	  };

  const handleArchiveWorker = async (workerId: string) => {
    if (!confirm('Are you sure you want to archive this worker? They will be moved to the archived section.')) {
      return;
    }
    try {
      await archiveWorker.mutateAsync(workerId);
    } catch (error) {
      console.error('Error archiving worker:', error);
      alert('Failed to archive worker');
    }
  };

  const handleUnarchiveWorker = async (workerId: string) => {
    try {
      await unarchiveWorker.mutateAsync(workerId);
    } catch (error) {
      console.error('Error unarchiving worker:', error);
      alert('Failed to unarchive worker');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) {
      alert('Please select a company first');
      return;
    }

    try {
	      // Normalise relation fields so we always send clean IDs to the backend.
	      // This avoids accidentally sending populated objects for company/manager/client.
	      const payload: any = {
	        ...formData,
	      };

	      if (payload.company && typeof payload.company === 'object') {
	        payload.company = (payload.company as any)._id;
	      }
	      if (payload.lineManager && typeof payload.lineManager === 'object') {
	        payload.lineManager = (payload.lineManager as any)._id;
	      }
	      if (payload.client && typeof payload.client === 'object') {
	        payload.client = (payload.client as any)._id;
	      }

      if (editingWorker) {
        await updateWorker.mutateAsync({
          id: editingWorker._id,
	          data: payload
        });
      } else {
	        const result = await createWorker.mutateAsync(payload);
        // If a password was generated, show it to the user
        if (result && (result as any).generatedPassword) {
          setNewPassword((result as any).generatedPassword);
          setShowPasswordModal(true);
        }
      }
      setShowModal(false);
      setEditingWorker(null);
      setFormData({
        employeeId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        paymentType: 'monthly-salary',
        employmentStatus: 'active',
        isActive: true,
        company: currentUser?.role === 'admin' ? '' : selectedCompany?._id,
        payrollInfo: {
          currency: 'MYR'
        }
      });
    } catch (error) {
      console.error('Error saving worker:', error);
      alert('Failed to save worker');
    }
  };

  const handleResetPassword = async (worker: Worker) => {
    if (!worker.user) {
      alert('This worker does not have a user account');
      return;
    }

    if (!confirm(`Reset password for ${worker.firstName} ${worker.lastName}?`)) {
      return;
    }

    try {
      const feathersClient = (await import('@/lib/feathers')).default;
      const response = await feathersClient.service(`users/${worker.user}/reset-password`).create({});
      setNewPassword(response.password);
      setShowPasswordModal(true);
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password');
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
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position & Dept
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Line Manager
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client / Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="sticky right-0 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                Actions
              </th>
            </tr>
          </thead>
	          <tbody className="bg-white divide-y divide-gray-200">
	            {filteredWorkers.map((worker) => {
	              const config = paymentTypeConfig[worker.paymentType as keyof typeof paymentTypeConfig] || paymentTypeConfig['hourly'];
	              const Icon = config.icon;

	              // Resolve project and client using the projects list so we can
	              // always show both client (top) and project (bottom).
	              const project = projects.find(
	                (p) => p._id === worker.project || p.name === worker.project
	              );
	          const clientFromProject =
	            project && typeof project.client === 'object' && project.client
	              ? project.client
	              : null;
	          const clientFromWorkerId =
	            !clientFromProject && typeof worker.client === 'string'
	              ? clients.find((c) => c._id === worker.client) || null
	              : null;
	          const clientToDisplay =
	            clientFromProject ||
	            clientFromWorkerId ||
	            (typeof worker.client === 'object' && worker.client
	              ? (worker.client as any)
	              : null);
	              const projectNameToDisplay = project ? project.name : worker.project;

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
                    {worker.jobDesignation && (
                      <div className="text-xs text-gray-400">{worker.jobDesignation}</div>
                    )}
                  </td>
	                  <td className="px-6 py-4 whitespace-nowrap">
	                    <div className="text-sm text-gray-900">
	                      {selectedCompany?.name
	                        || (typeof worker.company === 'object' && worker.company
	                          ? worker.company.name
	                          : 'N/A')}
	                    </div>
	                    {(selectedCompany?.registrationNumber
	                      || (typeof worker.company === 'object' && worker.company?.registrationNumber)) && (
	                      <div className="text-xs text-gray-500">
	                        {selectedCompany?.registrationNumber || (worker.company as Company)?.registrationNumber}
	                      </div>
	                    )}
	                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {typeof worker.lineManager === 'object' && worker.lineManager ? (
                      <div>
                        <div className="text-sm text-gray-900">
                          {worker.lineManager.firstName} {worker.lineManager.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{worker.lineManager.position}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
	                  <td className="px-6 py-4">
	                    <div className="space-y-1">
	                      {clientToDisplay ? (
	                        <div className="flex items-center gap-1.5">
	                          <span className="text-xs text-gray-400">🏢</span>
	                          <span className="text-sm font-medium text-gray-900">{clientToDisplay.name}</span>
	                        </div>
	                      ) : (
	                        <div className="text-xs text-gray-400">No client assigned</div>
	                      )}
	                      {projectNameToDisplay ? (
	                        <div className="flex items-center gap-1.5">
	                          <span className="text-xs text-gray-400">📋</span>
	                          <span className="text-xs text-gray-600">{projectNameToDisplay}</span>
	                        </div>
	                      ) : (
	                        <div className="text-xs text-gray-400">No project assigned</div>
	                      )}
	                    </div>
	                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                      <Icon className={`h-4 w-4 mr-1 ${config.iconColor}`} />
                      {config.label}
                    </span>
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
                  <td className="sticky right-0 bg-white px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                    {!showArchived ? (
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleEditWorker(worker)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Edit worker details"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        {worker.user && (
                          <button
                            onClick={() => handleResetPassword(worker)}
                            className="text-orange-600 hover:text-orange-900 transition-colors"
                            title="Reset worker password"
                          >
                            <span className="text-lg">🔑</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleArchiveWorker(worker._id)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          title="Archive this worker"
                        >
                          <ArchiveBoxIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUnarchiveWorker(worker._id)}
                        className="text-green-600 hover:text-green-900 transition-colors"
                        title="Restore this worker from archive"
                      >
                        <ArrowUturnLeftIcon className="h-5 w-5" />
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
              {/* Company Selection (Admin & Agent Only) */}
              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'agent') && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Assignment</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company *
                      </label>
                      <select
                        required
                        value={typeof formData.company === 'string' ? formData.company : ''}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">-- Select Company --</option>
                        {companies.map((company) => (
                          <option key={company._id} value={company._id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.employeeId || ''}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., W001"
                    />
                  </div>
                  <div></div>
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

              {/* Passport Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Passport Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Passport Number
                    </label>
                    <input
                      type="text"
                      value={formData.passportNumber || ''}
                      onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., A12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country of Issue
                    </label>
                    <input
                      type="text"
                      value={formData.passportCountry || ''}
                      onChange={(e) => setFormData({ ...formData, passportCountry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., Malaysia"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={formData.passportIssueDate || ''}
                      onChange={(e) => setFormData({ ...formData, passportIssueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.passportExpiryDate || ''}
                      onChange={(e) => setFormData({ ...formData, passportExpiryDate: e.target.value })}
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
                      Job Designation
                    </label>
                    <input
                      type="text"
                      value={formData.jobDesignation || ''}
                      onChange={(e) => setFormData({ ...formData, jobDesignation: e.target.value })}
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
                      Project
                    </label>
	                    <select
	                      value={typeof formData.project === 'string' ? formData.project : (formData.project as any) || ''}
	                      onChange={(e) => {
	                        const value = e.target.value;
				                const selectedProject = formProjects.find(
	                          (p) => p._id === value
	                        );
	                        setFormData((prev) => ({
	                          ...prev,
	                          project: value || undefined,
	                          // When a project is selected, auto-set client based on the
	                          // project's client so the linkage stays consistent.
	                          client: selectedProject && selectedProject.client
	                            ? (typeof selectedProject.client === 'string'
	                              ? selectedProject.client
	                              : (selectedProject.client as any)._id)
	                            : prev.client,
	                        }));
	                      }}
	                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
	                    >
	                      <option value="">-- Select Project --</option>
				              {formProjects.filter(p => p.isActive).map((project) => (
	                        <option key={project._id} value={project._id}>
	                          {typeof project.client === 'object' && project.client
	                            ? `${project.client.name} - ${project.name}`
	                            : project.name}
	                        </option>
	                      ))}
	                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line Manager
                    </label>
                    <select
                      value={typeof formData.lineManager === 'string' ? formData.lineManager : (formData.lineManager as any)?._id || ''}
                      onChange={(e) => setFormData({ ...formData, lineManager: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">-- Select Line Manager --</option>
		                      {formWorkers.filter(w => w.isActive).map((worker) => (
                        <option key={worker._id} value={worker._id}>
                          {worker.firstName} {worker.lastName} ({worker.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client
                    </label>
                    <select
                      value={typeof formData.client === 'string' ? formData.client : (formData.client as any)?._id || ''}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">-- Select Client --</option>
		                      {formClients.filter(c => c.isActive).map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
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

      {/* Password Modal (for both new worker and password reset) */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingWorker ? 'Password Reset Successful' : 'Worker Account Created'}
            </h2>
            <p className="text-gray-600 mb-4">
              {editingWorker
                ? 'The password has been reset. Please provide this password to the worker:'
                : 'A user account has been created for this worker. Please provide this password to them:'}
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600 mb-2">Password:</p>
              <p className="text-2xl font-mono font-bold text-indigo-600 break-all">{newPassword}</p>
            </div>
            <p className="text-sm text-amber-600 mb-6">
              ⚠️ This password will only be shown once. Make sure to save it or send it to the worker.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newPassword);
                  alert('Password copied to clipboard!');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Copy Password
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
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

