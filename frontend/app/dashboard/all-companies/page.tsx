'use client';

import { useState, useEffect } from 'react';
import feathersClient from '@/lib/feathers';
import { useCompanies, useUpdateCompany } from '@/hooks/useCompanies';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent' | 'subcon-admin' | 'worker' | 'user';
}

interface Company {
  _id: string;
  name: string;
  registrationNumber: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  subscription: {
    plan: string;
    status: string;
    maxWorkers: number;
    monthlyFee: number;
  };
  paymentTypes: string[];
  isActive: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  agent?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const approvalStatusConfig = {
  pending: { label: 'Pending', icon: ClockIcon, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  approved: { label: 'Approved', icon: CheckCircleIcon, color: 'text-green-600', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', icon: XCircleIcon, color: 'text-red-600', bgColor: 'bg-red-100' },
};

const planConfig = {
  trial: { label: 'Trial', color: 'bg-gray-100 text-gray-800' },
  basic: { label: 'Basic', color: 'bg-blue-100 text-blue-800' },
  standard: { label: 'Standard', color: 'bg-indigo-100 text-indigo-800' },
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-800' }
};

export default function AllCompaniesPage() {
  const { data: companies = [], isLoading: loading } = useCompanies();
  const updateCompany = useUpdateCompany();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchCurrentUser();
  }, []);

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

  // Filter companies
  const filteredCompanies = companies.filter((company: Company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || company.approvalStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (company: Company) => {
    if (!confirm(`Are you sure you want to approve ${company.name}?`)) return;

    try {
      await updateCompany.mutateAsync({
        id: company._id,
        data: {
          approvalStatus: 'approved',
          approvedBy: currentUser?._id,
          approvedAt: new Date().toISOString(),
          rejectionReason: undefined
        }
      });
    } catch (error) {
      console.error('Error approving company:', error);
      alert('Failed to approve company. Please try again.');
    }
  };

  const handleReject = (company: Company) => {
    setSelectedCompany(company);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedCompany || !rejectionReason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }

    try {
      await updateCompany.mutateAsync({
        id: selectedCompany._id,
        data: {
          approvalStatus: 'rejected',
          approvedBy: currentUser?._id,
          approvedAt: new Date().toISOString(),
          rejectionReason: rejectionReason.trim()
        }
      });
      setShowRejectModal(false);
      setSelectedCompany(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting company:', error);
      alert('Failed to reject company. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Only admin can access this page
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const pendingCount = companies.filter((c: Company) => c.approvalStatus === 'pending').length;
  const approvedCount = companies.filter((c: Company) => c.approvalStatus === 'approved').length;
  const rejectedCount = companies.filter((c: Company) => c.approvalStatus === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Companies</h1>
        <p className="text-gray-600 mt-2">Manage and approve company registrations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
            </div>
            <BuildingOfficeIcon className="h-10 w-10 text-gray-400" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-900">{pendingCount}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-yellow-400" />
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
        <div className="bg-red-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Rejected</p>
              <p className="text-2xl font-bold text-red-900">{rejectedCount}</p>
            </div>
            <XCircleIcon className="h-10 w-10 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or registration number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredCompanies.length === 0 ? (
          <div className="p-12 text-center">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No companies have been registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCompanies.map((company: Company) => {
                  const status = approvalStatusConfig[company.approvalStatus || 'approved'];
                  const StatusIcon = status.icon;
                  const plan = planConfig[company.subscription?.plan as keyof typeof planConfig] || planConfig.basic;

                  return (
                    <tr key={company._id} className="hover:bg-gray-50">
                      {/* Company */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <BuildingOfficeIcon className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{company.name}</div>
                            <div className="text-sm text-gray-500">{company.registrationNumber}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{company.email}</div>
                        <div className="text-sm text-gray-500">{company.phone}</div>
                      </td>

                      {/* Plan */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.color}`}>
                          {plan.label}
                        </span>
                      </td>

                      {/* Agent */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {company.agent ? (
                          <div className="text-sm">
                            <div className="text-gray-900">{company.agent.firstName} {company.agent.lastName}</div>
                            <div className="text-gray-500">{company.agent.email}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <StatusIcon className={`h-5 w-5 ${status.color} mr-2`} />
                          <span className="text-sm font-medium text-gray-900">{status.label}</span>
                        </div>
                        {company.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1">
                            Reason: {company.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {company.approvalStatus === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(company)}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(company)}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {company.approvalStatus === 'approved' && (
                          <span className="text-gray-400">Approved</span>
                        )}
                        {company.approvalStatus === 'rejected' && (
                          <button
                            onClick={() => handleApprove(company)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            Re-approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-500">
        Showing {filteredCompanies.length} of {companies.length} companies
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedCompany && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowRejectModal(false)}></div>

            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Reject Company
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                You are about to reject <strong>{selectedCompany.name}</strong>.
                Please provide a reason for rejection.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter the reason for rejecting this company..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedCompany(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                >
                  Reject Company
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

