'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useWorkers, useCreateWorker, useUpdateWorker, useArchiveWorker, useUnarchiveWorker } from '@/hooks/useWorkers';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/useCompanies';
import { useJobBands } from '@/hooks/useJobBands';
import { useWorkerGroups } from '@/hooks/useWorkerGroups';
import { useDepartments } from '@/hooks/useDepartments';
import {
  useWorkerDocuments,
  useCreateWorkerDocument,
  useUpdateWorkerDocument,
  useDeleteWorkerDocument,
  documentTypeLabels,
  documentStatusColors,
  getDaysUntilExpiry,
  WorkerDocument
} from '@/hooks/useWorkerDocuments';
import { useUpload, isImageFile, isFileSizeValid, getFileIcon } from '@/hooks/useUpload';
import { SignedImage } from '@/hooks/useSignedUrl';
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
  ArrowUturnLeftIcon,
  DocumentIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  PaperClipIcon
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

interface JobBand {
  _id: string;
  name: string;
  code?: string;
}

interface WorkerGroup {
  _id: string;
  name: string;
  code?: string;
}

interface ProjectLocation {
  _id?: string;
  name: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  isDefault?: boolean;
}

interface Project {
  _id: string;
  name: string;
  client?: string | Client;
  locations?: ProjectLocation[];
  isActive: boolean;
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
  workLocation?: string; // Location name from project locations
  lineManager?: string | LineManager;
  client?: string | Client;
  company?: string | Company;
  jobBand?: string | JobBand;
  workerGroup?: string | WorkerGroup;
  profilePicture?: string;
  profilePictureFileName?: string;
  // Identification
  icNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  // Passport
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  passportCountry?: string;
  // Employment
  paymentType: 'monthly-salary' | 'hourly' | 'unit-based';
  employmentStatus: string;
  employmentType?: string;
  joinDate?: string;
  isActive?: boolean;
  // Payroll
  payrollInfo?: {
    monthlySalary?: number;
    hourlyRate?: number;
    unitRates?: Array<{ unitType: string; ratePerUnit: number }>;
    currency?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    epfNumber?: string;
    socsoNumber?: string;
    taxNumber?: string;
  };
  // Address
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  // Emergency Contact
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
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
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const archiveWorker = useArchiveWorker();
  const unarchiveWorker = useUnarchiveWorker();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [activeFormTab, setActiveFormTab] = useState<'personal' | 'documents' | 'employment' | 'payment'>('personal');

  // Document management state
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<WorkerDocument | null>(null);
  const [documentFormData, setDocumentFormData] = useState<Partial<WorkerDocument>>({
    documentType: 'passport',
    documentName: '',
    documentNumber: '',
    countryOfIssue: '',
    issueDate: '',
    expiryDate: '',
    reminderEnabled: true,
    notes: ''
  });

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
    company: selectedCompany?._id || '',
    payrollInfo: {
      currency: 'MYR'
    }
  });

  // Update company in form when selectedCompany changes (and form is not in edit mode)
  useEffect(() => {
    if (selectedCompany?._id && !editingWorker) {
      setFormData(prev => ({ ...prev, company: selectedCompany._id }));
    }
  }, [selectedCompany?._id, editingWorker]);

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
const { data: jobBands = [] } = useJobBands(formCompanyId, { isActive: true });
        const { data: workerGroups = [] } = useWorkerGroups(formCompanyId, { isActive: true });
	const { data: departments = [] } = useDepartments(formCompanyId);

  // Document hooks - only fetch when editing a worker
  const { data: workerDocuments = [], refetch: refetchDocuments } = useWorkerDocuments(editingWorker?._id);
  const createDocument = useCreateWorkerDocument(editingWorker?._id);
  const updateDocument = useUpdateWorkerDocument(editingWorker?._id);
  const deleteDocument = useDeleteWorkerDocument(editingWorker?._id);

  // Upload hooks
  const { uploadProfilePicture, uploadDocument, uploading: uploadingFile } = useUpload();
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [documentFilePreview, setDocumentFilePreview] = useState<{ name: string; url?: string } | null>(null);

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
    setProfilePicturePreview(null);
    (window as any).__pendingProfilePicture = null;
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
      company: selectedCompany?._id || '',
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
	    setProfilePicturePreview(worker.profilePicture || null);
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
	      if (payload.jobBand && typeof payload.jobBand === 'object') {
	        payload.jobBand = (payload.jobBand as any)._id;
	      }
	      if (payload.workerGroup && typeof payload.workerGroup === 'object') {
	        payload.workerGroup = (payload.workerGroup as any)._id;
	      }

      if (editingWorker) {
        await updateWorker.mutateAsync({
          id: editingWorker._id,
	          data: payload
        });
      } else {
        // Ensure company is set for create
        const companyId = payload.company || selectedCompany?._id;
        if (!companyId) {
          throw new Error('Please select a company first');
        }
	        const result = await createWorker.mutateAsync({ ...payload, company: companyId });

        // Upload pending profile picture if exists
        const pendingPicture = (window as any).__pendingProfilePicture;
        if (pendingPicture && result?._id) {
          const uploadResult = await uploadProfilePicture(pendingPicture, result._id);
          if (uploadResult.success) {
            await updateWorker.mutateAsync({
              id: result._id,
              data: { profilePicture: uploadResult.url, profilePictureFileName: uploadResult.fileName }
            });
          }
          (window as any).__pendingProfilePicture = null;
        }

        // If a password was generated, show it to the user
        if (result && (result as any).generatedPassword) {
          setNewPassword((result as any).generatedPassword);
          setShowPasswordModal(true);
        }
      }
      setShowModal(false);
      setEditingWorker(null);
      setProfilePicturePreview(null);
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
      return `RM ${worker.payrollInfo?.monthlySalary?.toLocaleString()}/month`;
    } else if (worker.paymentType === 'hourly') {
      return `RM ${worker.payrollInfo?.hourlyRate}/hour`;
    } else {
      const rates = worker.payrollInfo?.unitRates || [];
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
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Workers</h1>
          <p className="text-xs md:text-base text-gray-600 mt-1">Manage employee records and information</p>
        </div>
        <button
          onClick={handleAddWorker}
          className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 md:py-2 md:px-6 rounded-lg transition-colors shadow-md text-xs md:text-sm"
        >
          <PlusIcon className="h-4 w-4 md:h-5 md:w-5" />
          Add Worker
        </button>
      </div>

      {/* Active/Archived Tabs */}
      <div className="flex gap-1.5 md:gap-2">
        <button
          onClick={() => setShowArchived(false)}
          className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm ${
            !showArchived
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Active Workers ({activeWorkers.length})
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm ${
            showArchived
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ArchiveBoxIcon className="h-4 w-4 md:h-5 md:w-5" />
          Archived ({archivedWorkers.length})
        </button>
      </div>

      {/* Stats Cards - Compact on mobile */}
      {!showArchived && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <div className="bg-white rounded-lg shadow p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-gray-600">Total Workers</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{activeWorkers.length}</p>
              </div>
              <UserGroupIcon className="h-6 w-6 md:h-10 md:w-10 text-gray-400" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-blue-600">Monthly Salary</p>
                <p className="text-lg md:text-2xl font-bold text-blue-900">
                  {activeWorkers.filter(w => w.paymentType === 'monthly-salary').length}
                </p>
              </div>
              <CurrencyDollarIcon className="h-6 w-6 md:h-10 md:w-10 text-blue-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-green-600">Hourly</p>
                <p className="text-lg md:text-2xl font-bold text-green-900">
                  {activeWorkers.filter(w => w.paymentType === 'hourly').length}
                </p>
              </div>
              <ClockIcon className="h-6 w-6 md:h-10 md:w-10 text-green-400" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm text-purple-600">Unit-Based</p>
                <p className="text-lg md:text-2xl font-bold text-purple-900">
                  {activeWorkers.filter(w => w.paymentType === 'unit-based').length}
                </p>
              </div>
              <CubeIcon className="h-6 w-6 md:h-10 md:w-10 text-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters - Scrollable on mobile */}
      <div className="bg-white rounded-lg shadow p-2 md:p-4">
        <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Workers ({workers.length})
          </button>
          <button
            onClick={() => setFilter('monthly-salary')}
            className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
              filter === 'monthly-salary'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="hidden sm:inline">Monthly Salary</span>
            <span className="sm:hidden">Monthly</span> ({workers.filter(w => w.paymentType === 'monthly-salary').length})
          </button>
          <button
            onClick={() => setFilter('hourly')}
            className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
              filter === 'hourly'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hourly ({workers.filter(w => w.paymentType === 'hourly').length})
          </button>
          <button
            onClick={() => setFilter('unit-based')}
            className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
              filter === 'unit-based'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="hidden sm:inline">Unit-Based</span>
            <span className="sm:hidden">Unit</span> ({workers.filter(w => w.paymentType === 'unit-based').length})
          </button>
        </div>
      </div>

      {/* Workers Table - Horizontal scroll on mobile */}
      <div className="bg-white rounded-lg shadow overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
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
                      {worker.profilePicture ? (
                        <SignedImage
                          src={worker.profilePicture}
                          alt={`${worker.firstName} ${worker.lastName}`}
                          className="shrink-0 h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-semibold">
                            {worker.firstName?.[0] || ''}{worker.lastName?.[0] || ''}
                          </span>
                        </div>
                      )}
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
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingWorker ? 'Edit Worker' : 'Add New Worker'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setActiveFormTab('personal');
                }}
                className="text-white hover:text-indigo-100 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <nav className="flex -mb-px">
                {[
                  { id: 'personal', label: 'Personal', icon: '👤' },
                  { id: 'documents', label: 'Documents', icon: '📄' },
                  { id: 'employment', label: 'Employment', icon: '💼' },
                  { id: 'payment', label: 'Payment', icon: '💰' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFormTab(tab.id as any)}
                    className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                      activeFormTab === tab.id
                        ? 'border-indigo-600 text-indigo-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-1.5">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Company Selection (Admin & Agent Only) - Show on Personal tab */}
                {activeFormTab === 'personal' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'agent') && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-amber-800 mb-2">
                      Company Assignment *
                    </label>
                    <select
                      required
                      value={typeof formData.company === 'string' ? formData.company : ''}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                    >
                      <option value="">-- Select Company --</option>
                      {companies.map((company) => (
                        <option key={company._id} value={company._id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Personal Information Tab */}
                {activeFormTab === 'personal' && (
                  <div className="space-y-4">
                    {/* Profile Picture Upload */}
                    <div className="flex items-start gap-6 pb-4 border-b border-gray-200">
                      <div className="shrink-0">
                        <div className="relative group">
                          {(profilePicturePreview || formData.profilePicture) ? (
                            <SignedImage
                              src={profilePicturePreview || formData.profilePicture}
                              alt="Profile"
                              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center border-4 border-white shadow-lg">
                              <PhotoIcon className="h-10 w-10 text-indigo-400" />
                            </div>
                          )}
                          <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <ArrowUpTrayIcon className="h-6 w-6 text-white" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                if (!isImageFile(file)) {
                                  alert('Please select an image file');
                                  return;
                                }
                                if (!isFileSizeValid(file, 5)) {
                                  alert('Image must be less than 5MB');
                                  return;
                                }

                                // Show preview immediately
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  setProfilePicturePreview(e.target?.result as string);
                                };
                                reader.readAsDataURL(file);

                                // Upload if editing existing worker
                                if (editingWorker?._id) {
                                  const result = await uploadProfilePicture(file, editingWorker._id);
                                  if (result.success && result.url) {
                                    setFormData({ ...formData, profilePicture: result.url });
                                  }
                                } else {
                                  // Store file for later upload after worker is created
                                  (window as any).__pendingProfilePicture = file;
                                }
                              }}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-2">Click to upload</p>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Profile Picture</h4>
                        <p className="text-xs text-gray-500 mb-2">
                          Upload a photo for this worker. Recommended: square image, at least 200x200 pixels.
                        </p>
                        {(profilePicturePreview || formData.profilePicture) && (
                          <button
                            type="button"
                            onClick={() => {
                              setProfilePicturePreview(null);
                              setFormData({ ...formData, profilePicture: undefined, profilePictureFileName: undefined });
                              (window as any).__pendingProfilePicture = null;
                            }}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
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
                      <div className="hidden sm:block"></div>
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

                    {/* Identification Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Identification</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            IC Number
                          </label>
                          <input
                            type="text"
                            value={formData.icNumber || ''}
                            onChange={(e) => setFormData({ ...formData, icNumber: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="e.g., 901234-56-7890"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''}
                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gender
                          </label>
                          <select
                            value={formData.gender || ''}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="">-- Select Gender --</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nationality
                          </label>
                          <input
                            type="text"
                            value={formData.nationality || 'Malaysian'}
                            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Address</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street Address
                          </label>
                          <input
                            type="text"
                            value={formData.address?.street || ''}
                            onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={formData.address?.city || ''}
                            onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={formData.address?.state || ''}
                            onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Postcode
                          </label>
                          <input
                            type="text"
                            value={formData.address?.postcode || ''}
                            onChange={(e) => setFormData({ ...formData, address: { ...formData.address, postcode: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            value={formData.address?.country || 'Malaysia'}
                            onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bank Information Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Bank Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bank Name
                          </label>
                          <select
                            value={formData.payrollInfo?.bankName || ''}
                            onChange={(e) => setFormData({ ...formData, payrollInfo: { ...formData.payrollInfo, bankName: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="">-- Select Bank --</option>
                            <option value="Maybank">Maybank</option>
                            <option value="CIMB">CIMB</option>
                            <option value="Public Bank">Public Bank</option>
                            <option value="RHB Bank">RHB Bank</option>
                            <option value="Hong Leong Bank">Hong Leong Bank</option>
                            <option value="AmBank">AmBank</option>
                            <option value="Bank Islam">Bank Islam</option>
                            <option value="Bank Rakyat">Bank Rakyat</option>
                            <option value="OCBC">OCBC</option>
                            <option value="UOB">UOB</option>
                            <option value="HSBC">HSBC</option>
                            <option value="Standard Chartered">Standard Chartered</option>
                            <option value="Alliance Bank">Alliance Bank</option>
                            <option value="Affin Bank">Affin Bank</option>
                            <option value="BSN">BSN</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Number
                          </label>
                          <input
                            type="text"
                            value={formData.payrollInfo?.bankAccountNumber || ''}
                            onChange={(e) => setFormData({ ...formData, payrollInfo: { ...formData.payrollInfo, bankAccountNumber: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="e.g., 1234567890"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Holder Name
                          </label>
                          <input
                            type="text"
                            value={formData.payrollInfo?.bankAccountName || ''}
                            onChange={(e) => setFormData({ ...formData, payrollInfo: { ...formData.payrollInfo, bankAccountName: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Name as per bank account"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Emergency Contact</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Name
                          </label>
                          <input
                            type="text"
                            value={formData.emergencyContact?.name || ''}
                            onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Relationship
                          </label>
                          <select
                            value={formData.emergencyContact?.relationship || ''}
                            onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, relationship: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="">-- Select Relationship --</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Parent">Parent</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Child">Child</option>
                            <option value="Friend">Friend</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Phone
                          </label>
                          <input
                            type="tel"
                            value={formData.emergencyContact?.phone || ''}
                            onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeFormTab === 'documents' && (
                  <div className="space-y-4">
                    {!editingWorker ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <DocumentIcon className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                        <p className="text-blue-700 font-medium">Save the worker first</p>
                        <p className="text-sm text-blue-600 mt-1">
                          You can add documents after creating the worker record.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Document List Header */}
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-800">
                            Worker Documents ({workerDocuments.length})
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDocument(null);
                              setDocumentFormData({
                                documentType: 'passport',
                                documentName: '',
                                documentNumber: '',
                                countryOfIssue: '',
                                issueDate: '',
                                expiryDate: '',
                                reminderEnabled: true,
                                notes: ''
                              });
                              setShowDocumentModal(true);
                            }}
                            className="flex items-center gap-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <PlusIcon className="h-4 w-4" />
                            Add Document
                          </button>
                        </div>

                        {/* Document List */}
                        {workerDocuments.length === 0 ? (
                          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                            <DocumentIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">No documents added yet</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Add passport, visa, work permit, and other documents
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {workerDocuments.map((doc: WorkerDocument) => {
                              const daysUntil = getDaysUntilExpiry(doc.expiryDate);
                              const statusColor = documentStatusColors[doc.status] || documentStatusColors.active;

                              return (
                                <div
                                  key={doc._id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${statusColor.border} ${statusColor.bg}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${doc.status === 'expired' ? 'bg-red-100' : doc.status === 'expiring-soon' ? 'bg-amber-100' : 'bg-white'}`}>
                                      <DocumentIcon className={`h-5 w-5 ${statusColor.text}`} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{doc.documentName}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                                          {documentTypeLabels[doc.documentType]}
                                        </span>
                                        {doc.fileUrl && (
                                          <a
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <PaperClipIcon className="h-3 w-3" />
                                            View
                                          </a>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                        {doc.documentNumber && <span>#{doc.documentNumber}</span>}
                                        {doc.expiryDate && (
                                          <span className={daysUntil !== null && daysUntil <= 7 ? 'text-red-600 font-medium' : ''}>
                                            {daysUntil !== null ? (
                                              daysUntil < 0 ? (
                                                <span className="flex items-center gap-1">
                                                  <ExclamationTriangleIcon className="h-3 w-3" />
                                                  Expired {Math.abs(daysUntil)} days ago
                                                </span>
                                              ) : daysUntil === 0 ? 'Expires today' : (
                                                `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`
                                              )
                                            ) : `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}`}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingDocument(doc);
                                        setDocumentFormData({
                                          documentType: doc.documentType,
                                          documentName: doc.documentName,
                                          documentNumber: doc.documentNumber || '',
                                          countryOfIssue: doc.countryOfIssue || '',
                                          issueDate: doc.issueDate ? doc.issueDate.split('T')[0] : '',
                                          expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : '',
                                          reminderEnabled: doc.reminderEnabled,
                                          notes: doc.notes || ''
                                        });
                                        setShowDocumentModal(true);
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                                      title="Edit document"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm('Are you sure you want to delete this document?')) {
                                          await deleteDocument.mutateAsync(doc._id);
                                        }
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded transition-colors"
                                      title="Delete document"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <p className="text-sm text-gray-500 mt-4">
                          💡 Documents with expiry dates will trigger reminders based on system settings.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Employment Information Tab */}
                {activeFormTab === 'employment' && (
                  <div className="space-y-4">
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
                        <select
                          required
                          value={formData.department || ''}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept: any) => (
                            <option key={dept._id} value={dept.name}>
                              {dept.name} {dept.code ? `(${dept.code})` : ''}
                            </option>
                          ))}
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

                    {/* Grouping Section */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Classification</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Job Band
                          </label>
                          <select
                            value={typeof formData.jobBand === 'string' ? formData.jobBand : (formData.jobBand as any)?._id || ''}
                            onChange={(e) => setFormData({ ...formData, jobBand: e.target.value || undefined })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="">-- Select Job Band --</option>
                            {jobBands.map((band: JobBand) => (
                              <option key={band._id} value={band._id}>
                                {band.name} {band.code ? `(${band.code})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Worker Group
                          </label>
                          <select
                            value={typeof formData.workerGroup === 'string' ? formData.workerGroup : (formData.workerGroup as any)?._id || ''}
                            onChange={(e) => setFormData({ ...formData, workerGroup: e.target.value || undefined })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="">-- Select Worker Group --</option>
                            {workerGroups.map((group: WorkerGroup) => (
                              <option key={group._id} value={group._id}>
                                {group.name} {group.code ? `(${group.code})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Assignment Section */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Assignment</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {/* 1. Client First */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Client
                          </label>
                          <select
                            value={typeof formData.client === 'string' ? formData.client : (formData.client as any)?._id || ''}
                            onChange={(e) => {
                              // When client changes, reset project and location
                              setFormData({
                                ...formData,
                                client: e.target.value,
                                project: undefined,
                                workLocation: undefined
                              });
                            }}
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

                        {/* 2. Project (filtered by Client) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project
                          </label>
                          <select
                            value={typeof formData.project === 'string' ? formData.project : (formData.project as any) || ''}
                            onChange={(e) => {
                              // When project changes, reset location
                              setFormData({
                                ...formData,
                                project: e.target.value || undefined,
                                workLocation: undefined
                              });
                            }}
                            disabled={!formData.client}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${!formData.client ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          >
                            <option value="">{formData.client ? '-- Select Project --' : '-- Select Client First --'}</option>
                            {formProjects
                              .filter(p => {
                                if (!p.isActive) return false;
                                if (!formData.client) return false;
                                const projectClientId = typeof p.client === 'string' ? p.client : (p.client as any)?._id;
                                const selectedClientId = typeof formData.client === 'string' ? formData.client : (formData.client as any)?._id;
                                return projectClientId === selectedClientId;
                              })
                              .map((project) => (
                                <option key={project._id} value={project._id}>
                                  {project.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* 3. Location (filtered by Project) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Work Location
                          </label>
                          {(() => {
                            const selectedProject = formProjects.find(p => p._id === formData.project);
                            const projectLocations = (selectedProject as any)?.locations || [];
                            return (
                              <select
                                value={formData.workLocation || ''}
                                onChange={(e) => setFormData({ ...formData, workLocation: e.target.value || undefined })}
                                disabled={!formData.project || projectLocations.length === 0}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${(!formData.project || projectLocations.length === 0) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              >
                                <option value="">
                                  {!formData.project
                                    ? '-- Select Project First --'
                                    : projectLocations.length === 0
                                      ? '-- No Locations Available --'
                                      : '-- Select Location --'}
                                </option>
                                {projectLocations.map((loc: ProjectLocation, idx: number) => (
                                  <option key={loc._id || idx} value={loc.name}>
                                    {loc.name} {loc.isDefault ? '(Default)' : ''}
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
                        </div>

                        {/* Line Manager */}
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
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Information Tab */}
                {activeFormTab === 'payment' && (
                  <div className="space-y-4">
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

                    {formData.paymentType === 'monthly-salary' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-blue-800 mb-2">
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
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          placeholder="e.g., 3000.00"
                        />
                        <p className="text-xs text-blue-600 mt-2">
                          💡 This amount will be used for monthly payroll calculations.
                        </p>
                      </div>
                    )}

                    {formData.paymentType === 'hourly' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-green-800 mb-2">
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
                          className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                          placeholder="e.g., 15.00"
                        />
                        <p className="text-xs text-green-600 mt-2">
                          💡 This rate supersedes Job Band/Worker Group rates.
                        </p>
                      </div>
                    )}

                    {formData.paymentType === 'unit-based' && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm text-purple-700">
                          💡 Unit-based rates can be configured in the Compensation settings.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form Actions Footer */}
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
                <div className="flex gap-2">
                  {activeFormTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['personal', 'documents', 'employment', 'payment'] as const;
                        const currentIdx = tabs.indexOf(activeFormTab);
                        if (currentIdx > 0) setActiveFormTab(tabs[currentIdx - 1]);
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      ← Previous
                    </button>
                  )}
                  {activeFormTab !== 'payment' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['personal', 'documents', 'employment', 'payment'] as const;
                        const currentIdx = tabs.indexOf(activeFormTab);
                        if (currentIdx < tabs.length - 1) setActiveFormTab(tabs[currentIdx + 1]);
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      Next →
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setActiveFormTab('personal');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
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

      {/* Document Add/Edit Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <DocumentIcon className="h-6 w-6" />
                {editingDocument ? 'Edit Document' : 'Add Document'}
              </h2>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="text-white hover:text-emerald-100 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type *
                  </label>
                  <select
                    required
                    value={documentFormData.documentType}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, documentType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {Object.entries(documentTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={documentFormData.documentName}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, documentName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., Malaysian Passport, Work Permit 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Number
                  </label>
                  <input
                    type="text"
                    value={documentFormData.documentNumber}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., A12345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country of Issue
                  </label>
                  <input
                    type="text"
                    value={documentFormData.countryOfIssue}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, countryOfIssue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., Malaysia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={documentFormData.issueDate}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, issueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={documentFormData.expiryDate}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={documentFormData.notes}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    rows={2}
                    placeholder="Any additional notes..."
                  />
                </div>

                {/* File Upload Section */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-emerald-400 transition-colors">
                    {(documentFilePreview || documentFormData.fileUrl) ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <PaperClipIcon className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {documentFilePreview?.name || documentFormData.fileName || 'Uploaded file'}
                            </p>
                            {documentFormData.fileUrl && (
                              <a
                                href={documentFormData.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-emerald-600 hover:underline"
                              >
                                View file
                              </a>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDocumentFilePreview(null);
                            setDocumentFormData({ ...documentFormData, fileUrl: undefined, fileName: undefined });
                            (window as any).__pendingDocumentFile = null;
                          }}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <ArrowUpTrayIcon className="h-8 w-8 text-gray-400" />
                        <span className="text-sm text-gray-600 mt-2">Click to upload document</span>
                        <span className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, or images (max 10MB)</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (!isFileSizeValid(file, 10)) {
                              alert('File must be less than 10MB');
                              return;
                            }

                            // Show preview
                            setDocumentFilePreview({ name: file.name });

                            // If editing existing document, upload now
                            if (editingDocument?._id) {
                              const result = await uploadDocument(file, editingWorker?._id, editingDocument._id);
                              if (result.success && result.url) {
                                setDocumentFormData({
                                  ...documentFormData,
                                  fileUrl: result.url,
                                  fileName: result.fileName
                                });
                              }
                            } else {
                              // Store for later upload
                              (window as any).__pendingDocumentFile = file;
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={documentFormData.reminderEnabled}
                      onChange={(e) => setDocumentFormData({ ...documentFormData, reminderEnabled: e.target.checked })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Enable expiry reminders</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Reminders will be sent based on the system settings (e.g., 30 days, 7 days, 3 days before expiry)
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDocumentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploadingFile}
                onClick={async () => {
                  if (!documentFormData.documentName || !documentFormData.documentType) {
                    alert('Please fill in required fields');
                    return;
                  }

                  try {
                    const payload = {
                      ...documentFormData,
                      worker: editingWorker?._id,
                      company: selectedCompany?._id || (typeof editingWorker?.company === 'string' ? editingWorker.company : editingWorker?.company?._id)
                    };

                    let savedDoc: any;
                    if (editingDocument) {
                      savedDoc = await updateDocument.mutateAsync({ id: editingDocument._id, data: payload });
                    } else {
                      savedDoc = await createDocument.mutateAsync(payload);
                    }

                    // Upload pending file if exists
                    const pendingFile = (window as any).__pendingDocumentFile;
                    if (pendingFile && savedDoc?._id) {
                      const uploadResult = await uploadDocument(pendingFile, editingWorker?._id, savedDoc._id);
                      if (uploadResult.success) {
                        await updateDocument.mutateAsync({
                          id: savedDoc._id,
                          data: { fileUrl: uploadResult.url, fileName: uploadResult.fileName }
                        });
                      }
                      (window as any).__pendingDocumentFile = null;
                    }

                    setShowDocumentModal(false);
                    setDocumentFilePreview(null);
                    refetchDocuments();
                  } catch (error) {
                    console.error('Error saving document:', error);
                    alert('Failed to save document');
                  }
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                {editingDocument ? 'Update Document' : 'Add Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

