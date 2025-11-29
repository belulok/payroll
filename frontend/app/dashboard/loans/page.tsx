'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLoans, useCreateLoan, useUpdateLoan, useDeleteLoan, type Loan } from '@/hooks/useLoans';
import { useWorkers } from '@/hooks/useWorkers';
import feathersClient from '@/lib/feathers';
import {
  BanknotesIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  company?: string;
}

export default function LoansPage() {
  const { selectedCompany } = useCompany();

  // Use TanStack Query hooks
  const { data: loans = [], isLoading: loading } = useLoans(selectedCompany?._id);
  const { data: workers = [] } = useWorkers(selectedCompany?._id);
  const createLoan = useCreateLoan(selectedCompany?._id);
  const updateLoan = useUpdateLoan(selectedCompany?._id);
  const deleteLoan = useDeleteLoan(selectedCompany?._id);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [formData, setFormData] = useState<Partial<Loan>>({
    worker: undefined,
    principalAmount: 0,
    interestRate: 0,
    hasInstallments: false,
    installmentType: 'fixed_amount',
    installmentAmount: 0,
    installmentCount: 1,
    startDate: new Date().toISOString().split('T')[0],
    currency: 'MYR',
    description: '',
    notes: ''
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const user = await feathersClient.authenticate();
      setCurrentUser(user.user);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const handleAddLoan = () => {
    setEditingLoan(null);
    setFormData({
      worker: undefined,
      principalAmount: 0,
      interestRate: 0,
      hasInstallments: false,
      installmentType: 'fixed_amount',
      installmentAmount: 0,
      installmentCount: 1,
      startDate: new Date().toISOString().split('T')[0],
      currency: 'MYR',
      description: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      worker: typeof loan.worker === 'object' ? loan.worker._id : loan.worker,
      principalAmount: loan.principalAmount,
      interestRate: loan.interestRate,
      hasInstallments: loan.hasInstallments,
      installmentType: loan.installmentType,
      installmentAmount: loan.installmentAmount,
      installmentCount: loan.installmentCount,
      startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : '',
      currency: loan.currency,
      description: loan.description || '',
      notes: loan.notes || ''
    });
    setShowModal(true);
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
      try {
        await deleteLoan.mutateAsync(loanId);
      } catch (error) {
        console.error('Failed to delete loan:', error);
        alert('Failed to delete loan');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload: any = { ...formData };

      // Convert string worker ID to proper format
      if (typeof payload.worker === 'string') {
        payload.worker = payload.worker;
      }

      if (editingLoan) {
        await updateLoan.mutateAsync({
          id: editingLoan._id,
          data: payload
        });
      } else {
        await createLoan.mutateAsync(payload);
      }

      setShowModal(false);
      setEditingLoan(null);
    } catch (error) {
      console.error('Failed to save loan:', error);
      alert('Failed to save loan');
    }
  };

  const filteredLoans = loans.filter(loan => {
    if (filter === 'all') return true;
    return loan.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XMarkIcon className="h-5 w-5 text-gray-500" />;
      case 'defaulted':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'defaulted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BanknotesIcon className="h-8 w-8 text-indigo-600" />
              Loan Management
            </h1>
            <p className="text-gray-600 mt-1">Manage employee loans and installments</p>
          </div>
          <button
            onClick={handleAddLoan}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium"
          >
            <PlusIcon className="h-5 w-5" />
            Add New Loan
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Loans</p>
              <p className="text-2xl font-bold text-gray-900">{loans.length}</p>
            </div>
            <BanknotesIcon className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Loans</p>
              <p className="text-2xl font-bold text-blue-600">
                {loans.filter(l => l.status === 'active').length}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {loans.filter(l => l.status === 'completed').length}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-bold text-orange-600">
                {loans.reduce((sum, loan) => sum + (loan.remainingAmount || 0), 0).toLocaleString('en-MY', {
                  style: 'currency',
                  currency: 'MYR'
                })}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Loans', count: loans.length },
              { key: 'active', label: 'Active', count: loans.filter(l => l.status === 'active').length },
              { key: 'completed', label: 'Completed', count: loans.filter(l => l.status === 'completed').length },
              { key: 'cancelled', label: 'Cancelled', count: loans.filter(l => l.status === 'cancelled').length },
              { key: 'defaulted', label: 'Defaulted', count: loans.filter(l => l.status === 'defaulted').length }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterOption.key
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {filterOption.label} ({filterOption.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Loan Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Installments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No loans found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {filter === 'all' ? 'Get started by creating a new loan.' : `No ${filter} loans found.`}
                  </p>
                  {filter === 'all' && (
                    <div className="mt-6">
                      <button
                        onClick={handleAddLoan}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Add New Loan
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan) => {
                const worker = typeof loan.worker === 'object' ? loan.worker : null;
                const progressPercentage = loan.totalAmount > 0
                  ? ((loan.totalPaidAmount / loan.totalAmount) * 100)
                  : 0;

                return (
                  <tr key={loan._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{loan.loanId}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(loan.loanDate).toLocaleDateString()}
                        </div>
                        {loan.description && (
                          <div className="text-xs text-gray-400 mt-1">{loan.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-semibold">
                            {worker?.firstName?.[0] || ''}{worker?.lastName?.[0] || ''}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {worker?.firstName} {worker?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{worker?.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {loan.totalAmount.toLocaleString('en-MY', {
                            style: 'currency',
                            currency: loan.currency
                          })}
                        </div>
                        <div className="text-sm text-gray-500">
                          Principal: {loan.principalAmount.toLocaleString('en-MY', {
                            style: 'currency',
                            currency: loan.currency
                          })}
                        </div>
                        {loan.interestRate > 0 && (
                          <div className="text-xs text-gray-400">
                            Interest: {loan.interestRate}%
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {loan.hasInstallments ? (
                          <>
                            <div>
                              {loan.installmentType === 'fixed_count'
                                ? `${loan.installmentCount} payments`
                                : `${loan.installmentAmount?.toLocaleString('en-MY', {
                                    style: 'currency',
                                    currency: loan.currency
                                  })}/month`
                              }
                            </div>
                            {loan.installments && (
                              <div className="text-xs text-gray-500">
                                {loan.installments.filter(i => i.status === 'paid').length} / {loan.installments.length} paid
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-500">Lump sum</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(loan.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                          {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {loan.totalPaidAmount.toLocaleString('en-MY', {
                              style: 'currency',
                              currency: loan.currency
                            })}
                          </span>
                          <span className="text-gray-400">
                            {progressPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Remaining: {loan.remainingAmount.toLocaleString('en-MY', {
                            style: 'currency',
                            currency: loan.currency
                          })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditLoan(loan)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title="Edit loan"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        {loan.status !== 'completed' && (
                          <button
                            onClick={() => handleDeleteLoan(loan._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Delete loan"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Loan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingLoan ? 'Edit Loan' : 'Add New Loan'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Employee Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee *
                    </label>
                    <select
                      required
                      value={formData.worker || ''}
                      onChange={(e) => setFormData({ ...formData, worker: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">-- Select Employee --</option>
                      {workers.map((worker) => (
                        <option key={worker._id} value={worker._id}>
                          {worker.firstName} {worker.lastName} ({worker.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Principal Amount *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.principalAmount || ''}
                      onChange={(e) => setFormData({ ...formData, principalAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.interestRate || ''}
                      onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency || 'MYR'}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="MYR">MYR</option>
                      <option value="USD">USD</option>
                      <option value="SGD">SGD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate || ''}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Installment Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Repayment Settings</h3>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.hasInstallments || false}
                      onChange={(e) => setFormData({ ...formData, hasInstallments: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Enable Monthly Installments
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    If enabled, the loan will be deducted from payroll in installments
                  </p>
                </div>

                {formData.hasInstallments && (
                  <div className="space-y-4 pl-6 border-l-2 border-indigo-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Installment Type
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="installmentType"
                            value="fixed_amount"
                            checked={formData.installmentType === 'fixed_amount'}
                            onChange={(e) => setFormData({ ...formData, installmentType: e.target.value as 'fixed_amount' | 'fixed_count' })}
                            className="border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Fixed Amount per Month</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="installmentType"
                            value="fixed_count"
                            checked={formData.installmentType === 'fixed_count'}
                            onChange={(e) => setFormData({ ...formData, installmentType: e.target.value as 'fixed_amount' | 'fixed_count' })}
                            className="border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Fixed Number of Payments</span>
                        </label>
                      </div>
                    </div>

                    {formData.installmentType === 'fixed_amount' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount per Month *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={formData.installmentAmount || ''}
                          onChange={(e) => setFormData({ ...formData, installmentAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {formData.installmentType === 'fixed_count' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Payments *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.installmentCount || ''}
                          onChange={(e) => setFormData({ ...formData, installmentCount: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="12"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Brief description of the loan purpose"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Additional notes or terms..."
                    />
                  </div>
                </div>
              </div>

              {/* Loan Summary */}
              {formData.principalAmount > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Loan Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Principal Amount:</span>
                      <span className="ml-2 font-medium">
                        {formData.principalAmount.toLocaleString('en-MY', {
                          style: 'currency',
                          currency: formData.currency || 'MYR'
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Interest ({formData.interestRate || 0}%):</span>
                      <span className="ml-2 font-medium">
                        {((formData.principalAmount * (formData.interestRate || 0)) / 100).toLocaleString('en-MY', {
                          style: 'currency',
                          currency: formData.currency || 'MYR'
                        })}
                      </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-900 font-semibold">Total Amount:</span>
                      <span className="ml-2 font-bold text-lg">
                        {(formData.principalAmount * (1 + (formData.interestRate || 0) / 100)).toLocaleString('en-MY', {
                          style: 'currency',
                          currency: formData.currency || 'MYR'
                        })}
                      </span>
                    </div>
                    {formData.hasInstallments && formData.installmentType === 'fixed_count' && formData.installmentCount > 0 && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Payment per Month:</span>
                        <span className="ml-2 font-medium">
                          {((formData.principalAmount * (1 + (formData.interestRate || 0) / 100)) / formData.installmentCount).toLocaleString('en-MY', {
                            style: 'currency',
                            currency: formData.currency || 'MYR'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  {editingLoan ? 'Update Loan' : 'Create Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
