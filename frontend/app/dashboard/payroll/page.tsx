'use client';

import { useState } from 'react';
import feathersClient from '@/lib/feathers';
import { useCompany } from '@/contexts/CompanyContext';
import { usePayrollRecords, useApprovePayroll, useGeneratePayroll } from '@/hooks/usePayroll';
import { useWorkers } from '@/hooks/useWorkers';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface Worker {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  paymentType: string;
}

interface PayrollRecord {
  _id: string;
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  periodStart: string;
  periodEnd: string;
  paymentType: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  paymentStatus: string;
  totalHours?: number;
  totalNormalHours?: number;
  totalOT1_5Hours?: number;
  totalOT2_0Hours?: number;
  monthlySalary?: number;
  totalAmount?: number;
  epf?: {
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
  };
  socso?: {
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
  };
  eis?: {
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
  };
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' }
};

const paymentStatusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: ClockIcon },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircleIcon }
};

export default function PayrollPage() {
  const { selectedCompany } = useCompany();

  // Use TanStack Query hooks
  const { data: payrolls = [], isLoading: loading } = usePayrollRecords(selectedCompany?._id);
  const { data: workers = [] } = useWorkers(selectedCompany?._id);
  const generatePayroll = useGeneratePayroll(selectedCompany?._id);
  const approvePayroll = useApprovePayroll(selectedCompany?._id);

  const [filter, setFilter] = useState<string>('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

  // Generate payroll form state
  const [selectedWorker, setSelectedWorker] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const handleGeneratePayroll = async () => {
    if (!selectedWorker || !periodStart || !periodEnd) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await generatePayroll.mutateAsync({
        workerId: selectedWorker,
        periodStart,
        periodEnd
      });

      alert('Payroll generated successfully!');
      setShowGenerateModal(false);
      setSelectedWorker('');
      setPeriodStart('');
      setPeriodEnd('');
    } catch (error: any) {
      console.error('Error generating payroll:', error);
      alert(error.message || 'Failed to generate payroll');
    }
  };

  const handleViewPayroll = (payroll: PayrollRecord) => {
    setSelectedPayroll(payroll);
    setShowViewModal(true);
  };

  const handleGeneratePDF = (payroll: PayrollRecord) => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('feathers-jwt');

    if (!token) {
      alert('Please log in to generate PDF');
      return;
    }

    // Open PDF in new tab with token in URL
    const pdfUrl = `/api/payroll/${payroll._id}/pdf?token=${encodeURIComponent(token)}`;
    window.open(pdfUrl, '_blank');
  };

  const handleApprove = async (payrollId: string) => {
    try {
      await approvePayroll.mutateAsync(payrollId);
      alert('Payroll approved successfully!');
    } catch (error) {
      console.error('Error approving payroll:', error);
      alert('Failed to approve payroll');
    }
  };

  const filteredPayrolls = filter === 'all'
    ? payrolls
    : payrolls.filter(p => p.status === filter);

  const totalGrossPay = payrolls.reduce((sum, p) => sum + (p.grossPay || 0), 0);
  const totalNetPay = payrolls.reduce((sum, p) => sum + (p.netPay || 0), 0);
  const pendingCount = payrolls.filter(p => p.status === 'draft').length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
          <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-600 mt-2">Generate and manage employee payroll</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md"
        >
          Generate Payroll
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{payrolls.length}</p>
            </div>
            <BanknotesIcon className="h-10 w-10 text-gray-400" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Total Gross Pay</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalGrossPay)}</p>
            </div>
            <BanknotesIcon className="h-10 w-10 text-blue-400" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Total Net Pay</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(totalNetPay)}</p>
            </div>
            <CheckCircleIcon className="h-10 w-10 text-green-400" />
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
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({payrolls.length})
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'draft'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Draft ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved ({payrolls.filter(p => p.status === 'approved').length})
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Worker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gross Pay
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deductions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Pay
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
            {filteredPayrolls.map((payroll) => {
              const status = statusConfig[payroll.status as keyof typeof statusConfig] || statusConfig.draft;
              const paymentStatus = paymentStatusConfig[payroll.paymentStatus as keyof typeof paymentStatusConfig] || paymentStatusConfig.pending;
              const PaymentIcon = paymentStatus.icon;

              return (
                <tr key={payroll._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold text-sm">
                          {payroll.worker?.firstName?.[0]}{payroll.worker?.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {payroll.worker?.firstName} {payroll.worker?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{payroll.worker?.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{formatDate(payroll.periodStart)}</div>
                    <div className="text-gray-500">to {formatDate(payroll.periodEnd)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {payroll.paymentType === 'monthly-salary' ? 'Monthly' :
                       payroll.paymentType === 'hourly' ? 'Hourly' :
                       payroll.paymentType === 'unit-based' ? 'Unit-Based' : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(payroll.grossPay || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {formatCurrency(payroll.totalDeductions || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatCurrency(payroll.netPay || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                      <div className="flex items-center">
                        <PaymentIcon className={`h-3 w-3 mr-1 ${paymentStatus.color.split(' ')[1]}`} />
                        <span className={`text-xs ${paymentStatus.color.split(' ')[1]}`}>
                          {paymentStatus.label}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {payroll.status === 'draft' && (
                        <button
                          onClick={() => handleApprove(payroll._id)}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleViewPayroll(payroll)}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        <EyeIcon className="h-4 w-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleGeneratePDF(payroll)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-medium"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredPayrolls.length === 0 && (
          <div className="text-center py-12">
            <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'Generate payroll to get started.' : 'No payroll records with this status.'}
            </p>
          </div>
        )}
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Generate Payroll</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Worker
                </label>
                <select
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Choose a worker...</option>
                  {workers.map((worker) => (
                    <option key={worker._id} value={worker._id}>
                      {worker.firstName} {worker.lastName} ({worker.employeeId}) - {worker.paymentType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Start
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period End
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePayroll}
                disabled={generatePayroll.isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatePayroll.isPending ? 'Generating...' : 'Generate Payroll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Payroll Modal */}
      {showViewModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Payroll Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Worker Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Worker Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">
                      {selectedPayroll.worker?.firstName} {selectedPayroll.worker?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Employee ID</p>
                    <p className="font-medium text-gray-900">{selectedPayroll.worker?.employeeId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Type</p>
                    <p className="font-medium text-gray-900">
                      {selectedPayroll.paymentType === 'monthly-salary' ? 'Monthly Salary' :
                       selectedPayroll.paymentType === 'hourly' ? 'Hourly' :
                       selectedPayroll.paymentType === 'unit-based' ? 'Unit-Based' : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Period</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(selectedPayroll.periodStart)} - {formatDate(selectedPayroll.periodEnd)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hours Breakdown (for hourly workers) */}
              {selectedPayroll.paymentType === 'hourly' && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Hours Breakdown</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-blue-600">Normal Hours</p>
                      <p className="text-xl font-bold text-blue-900">{selectedPayroll.totalNormalHours?.toFixed(1) || 0}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-yellow-600">OT 1.5x Hours</p>
                      <p className="text-xl font-bold text-yellow-900">{selectedPayroll.totalOT1_5Hours?.toFixed(1) || 0}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-orange-600">OT 2.0x Hours</p>
                      <p className="text-xl font-bold text-orange-900">{selectedPayroll.totalOT2_0Hours?.toFixed(1) || 0}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Hours</p>
                      <p className="text-xl font-bold text-gray-900">{selectedPayroll.totalHours?.toFixed(1) || 0}h</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pay Summary */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Pay Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Gross Pay</span>
                    <span className="font-bold text-gray-900">{formatCurrency(selectedPayroll.grossPay)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Total Deductions</span>
                    <span className="font-semibold">-{formatCurrency(selectedPayroll.totalDeductions)}</span>
                  </div>
                  <div className="border-t border-green-200 pt-2 flex justify-between text-lg">
                    <span className="font-bold text-gray-900">Net Pay</span>
                    <span className="font-bold text-green-600">{formatCurrency(selectedPayroll.netPay)}</span>
                  </div>
                </div>
              </div>

              {/* Statutory Deductions */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Statutory Deductions</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">EPF</p>
                    <p className="text-sm text-gray-700">Employee: {formatCurrency(selectedPayroll.epf?.employeeContribution || 0)}</p>
                    <p className="text-sm text-gray-700">Employer: {formatCurrency(selectedPayroll.epf?.employerContribution || 0)}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">Total: {formatCurrency(selectedPayroll.epf?.totalContribution || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">SOCSO</p>
                    <p className="text-sm text-gray-700">Employee: {formatCurrency(selectedPayroll.socso?.employeeContribution || 0)}</p>
                    <p className="text-sm text-gray-700">Employer: {formatCurrency(selectedPayroll.socso?.employerContribution || 0)}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">Total: {formatCurrency(selectedPayroll.socso?.totalContribution || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">EIS</p>
                    <p className="text-sm text-gray-700">Employee: {formatCurrency(selectedPayroll.eis?.employeeContribution || 0)}</p>
                    <p className="text-sm text-gray-700">Employer: {formatCurrency(selectedPayroll.eis?.employerContribution || 0)}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">Total: {formatCurrency(selectedPayroll.eis?.totalContribution || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              >
                Close
              </button>
              <button
                onClick={() => handleGeneratePDF(selectedPayroll)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

