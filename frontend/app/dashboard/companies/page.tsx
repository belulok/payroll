'use client';

import { useEffect, useState } from 'react';
import feathersClient from '@/lib/feathers';
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from '@/hooks/useCompanies';
import { BuildingOfficeIcon, UserGroupIcon, CheckCircleIcon, ClockIcon, XCircleIcon, XMarkIcon, QrCodeIcon, PlusIcon, PencilIcon, EyeIcon, ArrowPathIcon, ShareIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';

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
  workerCount?: number;
}

const planConfig = {
  trial: { label: 'Trial', color: 'bg-gray-100 text-gray-800', fee: 0 },
  basic: { label: 'Basic', color: 'bg-blue-100 text-blue-800', fee: 99 },
  standard: { label: 'Standard', color: 'bg-indigo-100 text-indigo-800', fee: 249 },
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-800', fee: 499 }
};

const statusConfig = {
  active: { label: 'Active', icon: CheckCircleIcon, color: 'text-green-600' },
  trial: { label: 'Trial', icon: ClockIcon, color: 'text-blue-600' },
  suspended: { label: 'Suspended', icon: XCircleIcon, color: 'text-red-600' },
  cancelled: { label: 'Cancelled', icon: XCircleIcon, color: 'text-gray-600' }
};

// Company Form Modal Component
function CompanyFormModal({ company, onClose, onSave }: {
  company: Company | null;
  onClose: () => void;
  onSave: (data: Partial<Company>) => void;
}) {
  const [formData, setFormData] = useState({
    name: company?.name || '',
    registrationNumber: company?.registrationNumber || '',
    email: company?.email || '',
    phone: company?.phone || '',
    address: {
      street: company?.address?.street || '',
      city: company?.address?.city || '',
      state: company?.address?.state || '',
      postcode: company?.address?.postcode || '',
      country: company?.address?.country || 'Malaysia'
    },
    subscription: {
      plan: company?.subscription?.plan || 'basic',
      status: company?.subscription?.status || 'trial',
      maxWorkers: company?.subscription?.maxWorkers || 50,
      monthlyFee: company?.subscription?.monthlyFee || 249
    },
    paymentTypes: company?.paymentTypes || ['monthly-salary', 'hourly', 'unit-based'],
    isActive: company?.isActive !== undefined ? company.isActive : true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handlePlanChange = (plan: string) => {
    const planDetails = planConfig[plan as keyof typeof planConfig];
    setFormData({
      ...formData,
      subscription: {
        ...formData.subscription,
        plan,
        monthlyFee: planDetails.fee,
        maxWorkers: plan === 'trial' ? 10 : plan === 'basic' ? 50 : plan === 'standard' ? 100 : 200
      }
    });
  };

  const togglePaymentType = (type: string) => {
    const types = formData.paymentTypes.includes(type)
      ? formData.paymentTypes.filter(t => t !== type)
      : [...formData.paymentTypes, type];
    setFormData({ ...formData, paymentTypes: types });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {company ? 'Edit Company' : 'Add New Company'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
                <input
                  type="text"
                  required
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={formData.subscription.plan}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="trial">Trial (RM 0)</option>
                  <option value="basic">Basic (RM 99)</option>
                  <option value="standard">Standard (RM 249)</option>
                  <option value="premium">Premium (RM 499)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.subscription.status}
                  onChange={(e) => setFormData({ ...formData, subscription: { ...formData.subscription, status: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment Types */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Types</h3>
            <div className="flex flex-wrap gap-3">
              {['monthly-salary', 'hourly', 'unit-based'].map((type) => (
                <label key={type} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paymentTypes.includes(type)}
                    onChange={() => togglePaymentType(type)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    {type === 'monthly-salary' ? 'Monthly Salary' : type === 'hourly' ? 'Hourly' : 'Unit-Based'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              {company ? 'Update Company' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Company Details Modal Component
function CompanyDetailsModal({ company, onClose }: { company: Company; onClose: () => void }) {
  const plan = planConfig[company.subscription?.plan as keyof typeof planConfig] || planConfig.basic;
  const status = statusConfig[company.subscription?.status as keyof typeof statusConfig] || statusConfig.active;
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Company Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-16 w-16 bg-indigo-100 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-gray-900">{company.name}</h3>
                <p className="text-sm text-gray-500">{company.registrationNumber}</p>
              </div>
            </div>
            <StatusIcon className={`h-8 w-8 ${status.color}`} />
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><span className="font-medium">Email:</span> {company.email}</p>
              <p className="text-sm"><span className="font-medium">Phone:</span> {company.phone}</p>
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Address</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm">
                {company.address.street && `${company.address.street}, `}
                {company.address.city && `${company.address.city}, `}
                {company.address.state && `${company.address.state} `}
                {company.address.postcode && company.address.postcode}
              </p>
              <p className="text-sm mt-1">{company.address.country}</p>
            </div>
          </div>

          {/* Subscription */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Subscription</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Plan</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${plan.color}`}>
                  {plan.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className="text-sm font-semibold text-gray-900">{status.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Max Workers</span>
                <span className="text-sm font-semibold text-gray-900">{company.subscription?.maxWorkers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly Fee</span>
                <span className="text-sm font-semibold text-gray-900">
                  RM {(company.subscription?.monthlyFee || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Workers</span>
                <span className="text-sm font-semibold text-gray-900">
                  {company.workerCount || 0} / {company.subscription?.maxWorkers || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Types */}
          {company.paymentTypes && company.paymentTypes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Types</h4>
              <div className="flex flex-wrap gap-2">
                {company.paymentTypes.map((type) => (
                  <span
                    key={type}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                  >
                    {type === 'monthly-salary' ? 'Monthly Salary' : type === 'hourly' ? 'Hourly' : 'Unit-Based'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  // Use TanStack Query hooks
  const { data: companies = [], isLoading: loading } = useCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

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

  const canAddCompany = () => {
    return currentUser?.role === 'admin';
  };

  const canEditCompany = (company: Company) => {
    if (currentUser?.role === 'admin') return true;
    if (currentUser?.role === 'subcon-admin' && currentUser.company === company._id) return true;
    return false;
  };

  const handleAddCompany = () => {
    setShowAddModal(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowEditModal(true);
  };

  const handleViewDetails = (company: Company) => {
    setSelectedCompany(company);
    setShowDetailsModal(true);
  };

  const handleSaveCompany = async (companyData: Partial<Company>) => {
    try {
      if (selectedCompany) {
        // Update existing company
        await updateCompany.mutateAsync({
          id: selectedCompany._id,
          data: companyData
        });
      } else {
        // Create new company
        await createCompany.mutateAsync(companyData);
      }
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedCompany(null);
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Failed to save company. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const activeCompanies = companies.filter(c => c.isActive);
  const totalRevenue = companies.reduce((sum, c) => sum + (c.subscription?.monthlyFee || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-2">Manage subcontractor companies and subscriptions</p>
        </div>
        {canAddCompany() && (
          <button
            onClick={handleAddCompany}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md"
          >
            + Add Company
          </button>
        )}
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
        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Active</p>
              <p className="text-2xl font-bold text-green-900">{activeCompanies.length}</p>
            </div>
            <CheckCircleIcon className="h-10 w-10 text-green-400" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Total Workers</p>
              <p className="text-2xl font-bold text-blue-900">
                {companies.reduce((sum, c) => sum + (c.workerCount || 0), 0)}
              </p>
            </div>
            <UserGroupIcon className="h-10 w-10 text-blue-400" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-purple-900">RM {totalRevenue.toLocaleString()}</p>
            </div>
            <BuildingOfficeIcon className="h-10 w-10 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => {
          const plan = planConfig[company.subscription?.plan as keyof typeof planConfig] || planConfig.basic;
          const status = statusConfig[company.subscription?.status as keyof typeof statusConfig] || statusConfig.active;
          const StatusIcon = status.icon;

          return (
            <div key={company._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                      <p className="text-sm text-gray-500">{company.registrationNumber}</p>
                    </div>
                  </div>
                  <StatusIcon className={`h-6 w-6 ${status.color}`} />
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">{company.email}</p>
                  <p className="text-sm text-gray-600">{company.phone}</p>
                  <p className="text-sm text-gray-500">
                    {company.address.city}, {company.address.state}
                  </p>
                </div>

                {/* Subscription Info */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Plan</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${plan.color}`}>
                      {plan.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Workers</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {company.workerCount || 0} / {company.subscription?.maxWorkers || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Monthly Fee</span>
                    <span className="text-sm font-semibold text-gray-900">
                      RM {(company.subscription?.monthlyFee || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Payment Types */}
                  {company.paymentTypes && company.paymentTypes.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-gray-500 mb-2">Payment Types:</p>
                      <div className="flex flex-wrap gap-1">
                        {company.paymentTypes.map((type) => (
                          <span
                            key={type}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {type === 'monthly-salary' ? 'Monthly' : type === 'hourly' ? 'Hourly' : 'Unit-Based'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                    onClick={() => handleViewDetails(company)}
                    className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    View Details
                  </button>
                  {canEditCompany(company) && (
                    <button
                      onClick={() => handleEditCompany(company)}
                      className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {companies.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new company.</p>
          {canAddCompany() && (
            <div className="mt-6">
              <button
                onClick={handleAddCompany}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md"
              >
                + Add Company
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Company Modal */}
      {(showAddModal || showEditModal) && (
        <CompanyFormModal
          company={selectedCompany}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setSelectedCompany(null);
          }}
          onSave={handleSaveCompany}
        />
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedCompany && (
        <CompanyDetailsModal
          company={selectedCompany}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCompany(null);
          }}
        />
      )}

    </div>
  );
}

